/**
 * Category types aligned with Postgres schema (categories, category_direction).
 */
export type CategoryType = 'income' | 'expense'

export interface Category {
	id: string
	userId: string
	groupId: string | null
	parentCategoryId: string | null
	name: string
	type: CategoryType
	description: string | null
	isActive: boolean
}

export interface CategoryGroup {
	id: string
	userId: string
	name: string
	direction: 'income' | 'expense' | 'both'
}

export interface CreateCategoryInput {
	name: string
	type: CategoryType
	groupId?: string | null
	parentCategoryId?: string | null
	description?: string | null
}

export interface UpdateCategoryInput {
	name?: string
	type?: CategoryType
	groupId?: string | null
	parentCategoryId?: string | null
	description?: string | null
}
