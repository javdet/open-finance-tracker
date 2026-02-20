/**
 * API client for budget templates.
 */
import type {
	Budget,
	BudgetTemplate,
	BudgetTemplateItem,
	BudgetTemplateWithItems,
	CreateBudgetTemplateInput,
	CreateBudgetTemplateItemInput,
	UpdateBudgetTemplateInput,
} from '@/types'
import { get, post, patch, del, type ApiOptions } from './client'

export function fetchTemplates(options?: ApiOptions): Promise<BudgetTemplate[]> {
	const query = options?.userId
		? `?userId=${encodeURIComponent(options.userId)}`
		: ''
	return get<BudgetTemplate[]>(`/api/budget-templates${query}`, options)
}

export function fetchTemplateById(
	id: string,
	options?: ApiOptions,
): Promise<BudgetTemplate> {
	const query = options?.userId
		? `?userId=${encodeURIComponent(options.userId)}`
		: ''
	return get<BudgetTemplate>(
		`/api/budget-templates/${encodeURIComponent(id)}${query}`,
		options,
	)
}

export function fetchTemplateItems(
	templateId: string,
	options?: ApiOptions,
): Promise<BudgetTemplateItem[]> {
	const query = options?.userId
		? `?userId=${encodeURIComponent(options.userId)}`
		: ''
	return get<BudgetTemplateItem[]>(
		`/api/budget-templates/${encodeURIComponent(templateId)}/items${query}`,
		options,
	)
}

export function createTemplate(
	data: CreateBudgetTemplateInput,
	options?: ApiOptions,
): Promise<BudgetTemplateWithItems> {
	return post<BudgetTemplateWithItems>(
		'/api/budget-templates',
		{
			name: data.name,
			baseCurrencyCode: data.baseCurrencyCode ?? 'USD',
			items: data.items,
		},
		options,
	)
}

export function updateTemplate(
	id: string,
	data: UpdateBudgetTemplateInput,
	options?: ApiOptions,
): Promise<BudgetTemplate> {
	return patch<BudgetTemplate>(
		`/api/budget-templates/${encodeURIComponent(id)}`,
		data,
		options,
	)
}

export function deleteTemplate(
	id: string,
	options?: ApiOptions,
): Promise<void> {
	return del(`/api/budget-templates/${encodeURIComponent(id)}`, options)
}

export function createTemplateItem(
	templateId: string,
	data: CreateBudgetTemplateItemInput,
	options?: ApiOptions,
): Promise<BudgetTemplateItem> {
	return post<BudgetTemplateItem>(
		`/api/budget-templates/${encodeURIComponent(templateId)}/items`,
		data,
		options,
	)
}

export function updateTemplateItem(
	templateId: string,
	itemId: string,
	data: { plannedAmount?: number; accountId?: string | null },
	options?: ApiOptions,
): Promise<BudgetTemplateItem> {
	return patch<BudgetTemplateItem>(
		`/api/budget-templates/${encodeURIComponent(templateId)}/items/${encodeURIComponent(itemId)}`,
		data,
		options,
	)
}

export function deleteTemplateItem(
	templateId: string,
	itemId: string,
	options?: ApiOptions,
): Promise<void> {
	return del(
		`/api/budget-templates/${encodeURIComponent(templateId)}/items/${encodeURIComponent(itemId)}`,
		options,
	)
}

export function applyTemplate(
	templateId: string,
	month: number,
	year: number,
	options?: ApiOptions,
): Promise<Budget> {
	return post<Budget>(
		`/api/budget-templates/${encodeURIComponent(templateId)}/apply`,
		{ month, year },
		options,
	)
}
