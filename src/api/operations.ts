/**
 * API client for operations (read/write using backend data access layer).
 */
import type {
	CreateOperationInput,
	Operation,
	OperationsQuery,
	UpdateOperationInput,
} from '@/types'
import { get, post, patch, del, type ApiOptions } from './client'

export interface ListOperationsResponse {
	rows: Operation[]
	total: number
}

export interface CategoryUsageResponse {
	categoryIds: string[]
}

export interface CategoryTotalsInBaseQuery {
	userId?: string
	fromTime: string
	toTime: string
	operationType: 'payment' | 'income'
	baseCurrencyCode?: string
}

export interface CategoryTotalsInBaseRow {
	categoryId: string | null
	actualAmount: number
}

export interface CategoryTotalsInBaseResponse {
	rows: CategoryTotalsInBaseRow[]
}

export function fetchCategoryTotalsInBase(
	query: CategoryTotalsInBaseQuery,
	options?: ApiOptions,
): Promise<CategoryTotalsInBaseResponse> {
	const params = new URLSearchParams()
	if (query.userId) params.set('userId', query.userId)
	params.set('fromTime', query.fromTime)
	params.set('toTime', query.toTime)
	params.set('operationType', query.operationType)
	if (query.baseCurrencyCode) {
		params.set('baseCurrencyCode', query.baseCurrencyCode)
	}
	const base = options?.userId ? { ...options } : undefined
	return get<CategoryTotalsInBaseResponse>(
		`/api/operations/category-totals?${params.toString()}`,
		base,
	)
}

export function fetchCategoryUsage(
	userId: string,
	operationType: 'payment' | 'income',
	options?: ApiOptions,
): Promise<CategoryUsageResponse> {
	const params = new URLSearchParams()
	params.set('userId', userId)
	params.set('operationType', operationType)
	return get<CategoryUsageResponse>(
		`/api/operations/category-usage?${params.toString()}`,
		options,
	)
}

export function fetchOperations(
	query: OperationsQuery,
	options?: ApiOptions,
): Promise<ListOperationsResponse> {
	const params = new URLSearchParams()
	if (query.userId) params.set('userId', query.userId)
	if (query.fromTime) params.set('fromTime', query.fromTime)
	if (query.toTime) params.set('toTime', query.toTime)
	if (query.accountId) params.set('accountId', query.accountId)
	if (query.categoryId) params.set('categoryId', query.categoryId)
	if (query.operationType) params.set('operationType', query.operationType)
	if (query.limit !== undefined) params.set('limit', String(query.limit))
	if (query.offset !== undefined) params.set('offset', String(query.offset))
	const base = options?.userId ? { ...options } : undefined
	return get<ListOperationsResponse>(
		`/api/operations?${params.toString()}`,
		base,
	)
}

export function fetchOperationById(
	id: string,
	options?: ApiOptions & { userId?: string },
): Promise<Operation> {
	const query = options?.userId ? `?userId=${encodeURIComponent(options.userId)}` : ''
	return get<Operation>(`/api/operations/${encodeURIComponent(id)}${query}`, options)
}

export function createOperation(
	data: CreateOperationInput,
	options?: ApiOptions,
): Promise<Operation> {
	return post<Operation>('/api/operations', data, options)
}

export function updateOperation(
	id: string,
	data: UpdateOperationInput,
	options?: ApiOptions,
): Promise<Operation> {
	return patch<Operation>(`/api/operations/${encodeURIComponent(id)}`, data, options)
}

export function deleteOperation(id: string, options?: ApiOptions): Promise<void> {
	return del(`/api/operations/${encodeURIComponent(id)}`, options)
}
