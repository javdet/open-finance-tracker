/**
 * API client for budgets and budget vs actual report.
 */
import type {
	Budget,
	BudgetItem,
	BudgetVsActualReport,
	CreateBudgetInput,
	CreateBudgetItemInput,
	UpdateBudgetInput,
} from '@/types'
import { get, post, patch, del, type ApiOptions } from './client'

export function fetchBudgets(options?: ApiOptions): Promise<Budget[]> {
	const query = options?.userId ? `?userId=${encodeURIComponent(options.userId)}` : ''
	return get<Budget[]>(`/api/budgets${query}`, options)
}

export function fetchBudgetById(
	id: string,
	options?: ApiOptions,
): Promise<Budget> {
	const query = options?.userId ? `?userId=${encodeURIComponent(options.userId)}` : ''
	return get<Budget>(`/api/budgets/${encodeURIComponent(id)}${query}`, options)
}

export function fetchBudgetItems(
	budgetId: string,
	options?: ApiOptions,
): Promise<BudgetItem[]> {
	const query = options?.userId ? `?userId=${encodeURIComponent(options.userId)}` : ''
	return get<BudgetItem[]>(
		`/api/budgets/${encodeURIComponent(budgetId)}/items${query}`,
		options,
	)
}

export function fetchBudgetVsActualReport(
	budgetId: string,
	options?: ApiOptions,
): Promise<BudgetVsActualReport> {
	const query = options?.userId ? `?userId=${encodeURIComponent(options.userId)}` : ''
	return get<BudgetVsActualReport>(
		`/api/budgets/${encodeURIComponent(budgetId)}/budget-vs-actual${query}`,
		options,
	)
}

export function createBudget(
	data: CreateBudgetInput,
	options?: ApiOptions,
): Promise<Budget> {
	return post<Budget>('/api/budgets', data, options)
}

export function updateBudget(
	id: string,
	data: UpdateBudgetInput,
	options?: ApiOptions,
): Promise<Budget> {
	return patch<Budget>(`/api/budgets/${encodeURIComponent(id)}`, data, options)
}

export function deleteBudget(id: string, options?: ApiOptions): Promise<void> {
	return del(`/api/budgets/${encodeURIComponent(id)}`, options)
}

export function findOrCreateMonthlyBudget(
	month: number,
	year: number,
	baseCurrencyCode: string = 'USD',
	options?: ApiOptions,
): Promise<Budget> {
	return post<Budget>(
		'/api/budgets/monthly',
		{ month, year, baseCurrencyCode },
		options,
	)
}

export function createBudgetItem(
	budgetId: string,
	data: CreateBudgetItemInput,
	options?: ApiOptions,
): Promise<BudgetItem> {
	return post<BudgetItem>(
		`/api/budgets/${encodeURIComponent(budgetId)}/items`,
		data,
		options,
	)
}

export function updateBudgetItem(
	budgetId: string,
	itemId: string,
	data: { plannedAmount?: number; accountId?: string | null },
	options?: ApiOptions,
): Promise<BudgetItem> {
	return patch<BudgetItem>(
		`/api/budgets/${encodeURIComponent(budgetId)}/items/${encodeURIComponent(itemId)}`,
		data,
		options,
	)
}

export function deleteBudgetItem(
	budgetId: string,
	itemId: string,
	options?: ApiOptions,
): Promise<void> {
	return del(
		`/api/budgets/${encodeURIComponent(budgetId)}/items/${encodeURIComponent(itemId)}`,
		options,
	)
}
