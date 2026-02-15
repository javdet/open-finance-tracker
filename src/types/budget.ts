/**
 * Budget types aligned with Postgres schema (budgets, budget_items, period_type).
 */
export type PeriodType = 'month' | 'week' | 'custom'

export interface Budget {
	id: string
	userId: string
	name: string
	periodType: PeriodType
	startDate: string
	endDate: string
	baseCurrencyCode: string
	notes: string | null
	createdAt: string
}

export interface BudgetItem {
	id: string
	budgetId: string
	categoryId: string
	plannedAmount: number
	accountId: string | null
	createdAt: string
}

export interface BudgetWithItems extends Budget {
	items: BudgetItem[]
}

export interface CreateBudgetInput {
	name: string
	periodType: PeriodType
	startDate: string
	endDate: string
	baseCurrencyCode: string
	notes?: string | null
	items?: CreateBudgetItemInput[]
}

export interface CreateBudgetItemInput {
	categoryId: string
	plannedAmount: number
	accountId?: string | null
}

export interface UpdateBudgetInput {
	name?: string
	periodType?: PeriodType
	startDate?: string
	endDate?: string
	baseCurrencyCode?: string
	notes?: string | null
}

/** Per-category budget vs actual row for reporting. */
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
	/** Total planned (expense categories). */
	totalPlanned: number
	/** Total actual (payments in period). */
	totalActual: number
	/** totalPlanned - totalActual (positive = under budget). */
	totalVariance: number
}
