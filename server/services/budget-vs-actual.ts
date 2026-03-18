/**
 * Budget vs actual report: compares planned amounts (budget_items) to actual
 * spending/income over the budget date range, converting foreign-currency
 * operations to the budget's base currency via exchange_rates.
 * Includes rows for categories that have actual transactions even when there
 * is no budget item for that category (planned=0).
 */
import { getPool } from '../db/client.js'
import * as accountsRepo from '../repositories/accounts.js'
import * as budgetsRepo from '../repositories/budgets.js'
import * as budgetItemsRepo from '../repositories/budget-items.js'
import * as categoriesRepo from '../repositories/categories.js'
import * as operationsRepo from '../repositories/operations.js'
import * as scheduledTxRepo from '../repositories/scheduled-transactions.js'
import { ensureRatesForDate } from './exchange-rate-cache.js'
import { sumAccountBalancesInBase } from './currency-conversion.js'

export interface BudgetVsActualRow {
	categoryId: string
	categoryName: string
	categoryDirection: 'income' | 'expense'
	plannedAmount: number
	actualAmount: number
	scheduledAmount: number
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
	scheduledTotal: number
	incomeScheduledTotal: number
	expenseScheduledTotal: number
	incomeTotalPlanned: number
	incomeTotalActual: number
	expenseTotalPlanned: number
	expenseTotalActual: number
	/** Sum of all account balances at start of budget period, in base currency. */
	accountBalanceAtPeriodStart: number
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

	// Operations range: [start_date 00:00:00, end_date+1 00:00:00)
	const fromTime = `${budget.startDate}T00:00:00.000Z`
	const toTimeExclusive = new Date(budget.endDate)
	toTimeExclusive.setUTCDate(toTimeExclusive.getUTCDate() + 1)
	const toTime = toTimeExclusive.toISOString()

	await ensureRatesForDate(budget.baseCurrencyCode, budget.startDate, pool)
	const baseCurrency = budget.baseCurrencyCode

	const [
		incomeActuals,
		expenseActuals,
		categories,
		scheduledTotals,
		accountBalancesAtStart,
	] = await Promise.all([
		operationsRepo.sumAmountInBaseByCategory(
			userId,
			fromTime,
			toTime,
			'income',
			baseCurrency,
			pool,
		),
		operationsRepo.sumAmountInBaseByCategory(
			userId,
			fromTime,
			toTime,
			'payment',
			baseCurrency,
			pool,
		),
		categoriesRepo.listCategoriesByUser(userId, pool),
		scheduledTxRepo.getCategoryTotals(userId, pool),
		accountsRepo.listAccountBalancesAtDate(userId, fromTime, pool),
	])

	const actualByCategory = new Map<string, number>()
	incomeActuals.forEach((a) => {
		actualByCategory.set(a.category_id, Number(a.actual_amount))
	})
	expenseActuals.forEach((a) => {
		actualByCategory.set(a.category_id, Number(a.actual_amount))
	})

	const scheduledByCategory = new Map<string, number>()
	for (const st of scheduledTotals) {
		scheduledByCategory.set(st.categoryId, st.monthlyTotal)
	}

	const categoryById = new Map(categories.map((c) => [c.id, c]))
	const budgetItemCategoryIds = new Set(itemsWithNames.map((i) => i.category_id))

	let totalPlanned = 0
	let totalActual = 0
	let scheduledTotal = 0
	let incomeScheduledTotal = 0
	let expenseScheduledTotal = 0
	let incomeTotalPlanned = 0
	let incomeTotalActual = 0
	let expenseTotalPlanned = 0
	let expenseTotalActual = 0

	const rows: BudgetVsActualRow[] = []

	for (const item of itemsWithNames) {
		const planned = Number(item.planned_amount)
		const actual = actualByCategory.get(item.category_id) ?? 0
		const scheduled = scheduledByCategory.get(item.category_id) ?? 0
		const direction =
			item.category_direction === 'income' ? 'income' : 'expense'

		totalPlanned += planned
		totalActual += actual
		scheduledTotal += scheduled
		if (direction === 'income') {
			incomeTotalPlanned += planned
			incomeTotalActual += actual
			incomeScheduledTotal += scheduled
		} else {
			expenseTotalPlanned += planned
			expenseTotalActual += actual
			expenseScheduledTotal += scheduled
		}
		rows.push({
			categoryId: item.category_id,
			categoryName: item.category_name,
			categoryDirection: direction as 'income' | 'expense',
			plannedAmount: planned,
			actualAmount: actual,
			scheduledAmount: scheduled,
			variance: planned - actual,
			currencyCode: budget.baseCurrencyCode,
		})
	}

	for (const [categoryId, actual] of actualByCategory) {
		if (budgetItemCategoryIds.has(categoryId)) continue
		const cat = categoryById.get(categoryId)
		if (!cat) continue
		const direction = cat.type
		const scheduled = scheduledByCategory.get(categoryId) ?? 0
		totalActual += actual
		scheduledTotal += scheduled
		if (direction === 'income') {
			incomeTotalActual += actual
			incomeScheduledTotal += scheduled
		} else {
			expenseTotalActual += actual
			expenseScheduledTotal += scheduled
		}
		rows.push({
			categoryId,
			categoryName: cat.name,
			categoryDirection: direction as 'income' | 'expense',
			plannedAmount: 0,
			actualAmount: actual,
			scheduledAmount: scheduled,
			variance: -actual,
			currencyCode: budget.baseCurrencyCode,
		})
	}

	const accountBalanceAtPeriodStart = await sumAccountBalancesInBase(
		accountBalancesAtStart,
		baseCurrency,
		budget.startDate,
		pool,
	)

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
		scheduledTotal,
		incomeScheduledTotal,
		expenseScheduledTotal,
		incomeTotalPlanned,
		incomeTotalActual,
		expenseTotalPlanned,
		expenseTotalActual,
		accountBalanceAtPeriodStart,
	}
}

