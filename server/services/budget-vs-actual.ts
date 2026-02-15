/**
 * Budget vs actual report: compares planned amounts (budget_items) to actual
 * spending/income (operations.amount_in_base) over the budget date range.
 */
import { getPool } from '../db/client.js'
import * as budgetsRepo from '../repositories/budgets.js'
import * as budgetItemsRepo from '../repositories/budget-items.js'
import * as operationsRepo from '../repositories/operations.js'

export interface BudgetVsActualRow {
	categoryId: string
	categoryName: string
	plannedAmount: number
	actualAmount: number
	variance: number
	currencyCode: string
}

export interface BudgetVsActualReport {
	budgetId: string
	budgetName: string
	startDate: string
	endDate: string
	baseCurrencyCode: string
	rows: BudgetVsActualRow[]
	totalPlanned: number
	totalActual: number
	totalVariance: number
}

/**
 * Builds the budget vs actual report for a given budget.
 * - Planned amounts come from budget_items (expense categories).
 * - Actual amounts are SUM(amount_in_base) from operations where
 *   operation_type = 'payment' and operation_time in [start_date, end_date).
 * End date is exclusive (next day 00:00:00) so that a monthly budget is
 * [2026-02-01 00:00, 2026-03-01 00:00).
 */
export async function getBudgetVsActualReport(
	budgetId: string,
	userId: string,
): Promise<BudgetVsActualReport | null> {
	const pool = getPool()

	const budget = await budgetsRepo.getBudgetById(budgetId, userId, pool)
	if (!budget) {
		return null
	}

	const itemsWithNames =
		await budgetItemsRepo.getBudgetItemsWithCategoryNames(budgetId, pool)
	if (itemsWithNames.length === 0) {
		return {
			budgetId: budget.id,
			budgetName: budget.name,
			startDate: budget.startDate,
			endDate: budget.endDate,
			baseCurrencyCode: budget.baseCurrencyCode,
			rows: [],
			totalPlanned: 0,
			totalActual: 0,
			totalVariance: 0,
		}
	}

	// Operations range: start_date 00:00:00 to end_date 23:59:59.999 (inclusive day)
	const fromTime = `${budget.startDate}T00:00:00.000Z`
	const toTimeExclusive = new Date(budget.endDate)
	toTimeExclusive.setUTCDate(toTimeExclusive.getUTCDate() + 1)
	const toTime = toTimeExclusive.toISOString()

	// Separate items by category direction (income vs expense)
	const incomeItems = itemsWithNames.filter((item) => item.category_direction === 'income')
	const expenseItems = itemsWithNames.filter((item) => item.category_direction === 'expense')

	// Fetch actuals for both income and expenses
	const [incomeActuals, expenseActuals] = await Promise.all([
		incomeItems.length > 0
			? operationsRepo.sumAmountInBaseByCategory(
					userId,
					fromTime,
					toTime,
					'income',
					pool,
				)
			: [],
		expenseItems.length > 0
			? operationsRepo.sumAmountInBaseByCategory(
					userId,
					fromTime,
					toTime,
					'payment',
					pool,
				)
			: [],
	])

	const actualByCategory = new Map<string, number>()
	incomeActuals.forEach((a) => {
		actualByCategory.set(a.category_id, Number(a.actual_amount))
	})
	expenseActuals.forEach((a) => {
		actualByCategory.set(a.category_id, Number(a.actual_amount))
	})

	let totalPlanned = 0
	let totalActual = 0
	const rows: BudgetVsActualRow[] = itemsWithNames.map((item) => {
		const planned = Number(item.planned_amount)
		const actual = actualByCategory.get(item.category_id) ?? 0
		totalPlanned += planned
		totalActual += actual
		return {
			categoryId: item.category_id,
			categoryName: item.category_name,
			plannedAmount: planned,
			actualAmount: actual,
			variance: planned - actual,
			currencyCode: budget.baseCurrencyCode,
		}
	})

	return {
		budgetId: budget.id,
		budgetName: budget.name,
		startDate: budget.startDate,
		endDate: budget.endDate,
		baseCurrencyCode: budget.baseCurrencyCode,
		rows,
		totalPlanned,
		totalActual,
		totalVariance: totalPlanned - totalActual,
	}
}
