/**
 * Budget template types aligned with budget_templates and budget_template_items.
 */
export interface BudgetTemplate {
	id: string
	userId: string
	name: string
	baseCurrencyCode: string
	createdAt: string
}

export interface BudgetTemplateItem {
	id: string
	templateId: string
	categoryId: string
	plannedAmount: number
	accountId: string | null
	createdAt: string
}

export interface BudgetTemplateWithItems extends BudgetTemplate {
	items: BudgetTemplateItem[]
}

export interface CreateBudgetTemplateInput {
	name: string
	baseCurrencyCode: string
	items?: CreateBudgetTemplateItemInput[]
}

export interface CreateBudgetTemplateItemInput {
	categoryId: string
	plannedAmount: number
	accountId?: string | null
}

export interface UpdateBudgetTemplateInput {
	name?: string
	baseCurrencyCode?: string
}
