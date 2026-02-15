/**
 * API client for categories and category groups.
 */
import type {
	Category,
	CategoryGroup,
	CreateCategoryInput,
	UpdateCategoryInput,
} from '@/types'
import { get, post, patch, type ApiOptions } from './client'

export function fetchCategories(options?: ApiOptions): Promise<Category[]> {
	const query = options?.userId ? `?userId=${encodeURIComponent(options.userId)}` : ''
	return get<Category[]>(`/api/categories${query}`, options)
}

export function fetchCategoryGroups(
	options?: ApiOptions,
): Promise<CategoryGroup[]> {
	const query = options?.userId ? `?userId=${encodeURIComponent(options.userId)}` : ''
	return get<CategoryGroup[]>(`/api/categories/groups${query}`, options)
}

export function createCategory(
	data: CreateCategoryInput,
	options?: ApiOptions,
): Promise<Category> {
	return post<Category>('/api/categories', data, options)
}

export function updateCategory(
	id: string,
	data: UpdateCategoryInput,
	options?: ApiOptions,
): Promise<Category> {
	return patch<Category>(`/api/categories/${encodeURIComponent(id)}`, data, options)
}
