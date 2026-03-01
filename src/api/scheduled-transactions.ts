/**
 * API client for scheduled transactions (CRUD + category totals).
 */
import type {
	CreateScheduledTransactionInput,
	ScheduledCategoryTotal,
	ScheduledTransaction,
	UpdateScheduledTransactionInput,
} from '@/types'
import { get, post, patch, del, type ApiOptions } from './client'

export interface ScheduledCategoryTotalsResponse {
	rows: ScheduledCategoryTotal[]
}

export function fetchScheduledTransactions(
	userId: string,
	options?: ApiOptions,
): Promise<ScheduledTransaction[]> {
	const params = new URLSearchParams()
	params.set('userId', userId)
	return get<ScheduledTransaction[]>(
		`/api/scheduled-transactions?${params.toString()}`,
		options,
	)
}

export function fetchScheduledTransactionById(
	id: string,
	options?: ApiOptions & { userId?: string },
): Promise<ScheduledTransaction> {
	const query = options?.userId
		? `?userId=${encodeURIComponent(options.userId)}`
		: ''
	return get<ScheduledTransaction>(
		`/api/scheduled-transactions/${encodeURIComponent(id)}${query}`,
		options,
	)
}

export function createScheduledTransaction(
	data: CreateScheduledTransactionInput,
	options?: ApiOptions,
): Promise<ScheduledTransaction> {
	return post<ScheduledTransaction>(
		'/api/scheduled-transactions',
		data,
		options,
	)
}

export function updateScheduledTransaction(
	id: string,
	data: UpdateScheduledTransactionInput,
	options?: ApiOptions,
): Promise<ScheduledTransaction> {
	return patch<ScheduledTransaction>(
		`/api/scheduled-transactions/${encodeURIComponent(id)}`,
		data,
		options,
	)
}

export function deleteScheduledTransaction(
	id: string,
	options?: ApiOptions,
): Promise<void> {
	return del(
		`/api/scheduled-transactions/${encodeURIComponent(id)}`,
		options,
	)
}

export function fetchScheduledCategoryTotals(
	userId: string,
	options?: ApiOptions,
): Promise<ScheduledCategoryTotalsResponse> {
	const params = new URLSearchParams()
	params.set('userId', userId)
	return get<ScheduledCategoryTotalsResponse>(
		`/api/scheduled-transactions/category-totals?${params.toString()}`,
		options,
	)
}
