/**
 * Data access for categories and category_groups tables.
 */
import type { Pool } from 'pg'
import { getPool } from '../db/client.js'

export interface CategoryRow {
	id: string
	user_id: string
	group_id: string | null
	parent_category_id: string | null
	name: string
	direction: string
	description: string | null
	is_active: boolean
}

export interface CategoryGroupRow {
	id: string
	user_id: string
	name: string
	direction: string
}

export interface CreateCategoryRow {
	user_id: string
	name: string
	direction: string
	group_id?: string | null
	parent_category_id?: string | null
	description?: string | null
	is_active?: boolean
}

export interface UpdateCategoryRow {
	name?: string
	direction?: string
	group_id?: string | null
	parent_category_id?: string | null
	description?: string | null
	is_active?: boolean
}

function rowToCategory(row: CategoryRow) {
	return {
		id: String(row.id),
		userId: String(row.user_id),
		groupId: row.group_id != null ? String(row.group_id) : null,
		parentCategoryId:
			row.parent_category_id != null
				? String(row.parent_category_id)
				: null,
		name: row.name,
		type: row.direction as 'income' | 'expense',
		description: row.description,
		isActive: row.is_active,
	}
}

function rowToCategoryGroup(row: CategoryGroupRow) {
	return {
		id: String(row.id),
		userId: String(row.user_id),
		name: row.name,
		direction: row.direction as 'income' | 'expense' | 'both',
	}
}

export async function listCategoriesByUser(
	userId: string,
	pool?: Pool,
): Promise<ReturnType<typeof rowToCategory>[]> {
	const client = pool ?? getPool()
	const result = await client.query<CategoryRow>(
		`SELECT id, user_id, group_id, parent_category_id, name, direction,
		        description, is_active
		 FROM categories
		 WHERE user_id = $1 AND is_active = true
		 ORDER BY COALESCE(parent_category_id, group_id, id), id`,
		[userId],
	)
	return result.rows.map(rowToCategory)
}

export async function listCategoryGroupsByUser(
	userId: string,
	pool?: Pool,
): Promise<ReturnType<typeof rowToCategoryGroup>[]> {
	const client = pool ?? getPool()
	const result = await client.query<CategoryGroupRow>(
		`SELECT id, user_id, name, direction
		 FROM category_groups
		 WHERE user_id = $1
		 ORDER BY name`,
		[userId],
	)
	return result.rows.map(rowToCategoryGroup)
}

export async function createCategory(
	data: CreateCategoryRow,
	pool?: Pool,
): Promise<ReturnType<typeof rowToCategory>> {
	const client = pool ?? getPool()
	const result = await client.query<CategoryRow>(
		`INSERT INTO categories (user_id, name, direction, group_id, parent_category_id,
		                         description, is_active)
		 VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, true))
		 RETURNING id, user_id, group_id, parent_category_id, name, direction,
		           description, is_active`,
		[
			data.user_id,
			data.name,
			data.direction,
			data.group_id ?? null,
			data.parent_category_id ?? null,
			data.description ?? null,
			data.is_active ?? true,
		],
	)
	return rowToCategory(result.rows[0])
}

export async function getCategoryById(
	id: string,
	userId: string,
	pool?: Pool,
): Promise<ReturnType<typeof rowToCategory> | null> {
	const client = pool ?? getPool()
	const result = await client.query<CategoryRow>(
		`SELECT id, user_id, group_id, parent_category_id, name, direction,
		        description, is_active
		 FROM categories WHERE id = $1 AND user_id = $2`,
		[id, userId],
	)
	const row = result.rows[0]
	return row ? rowToCategory(row) : null
}

export async function updateCategory(
	id: string,
	userId: string,
	data: UpdateCategoryRow,
	pool?: Pool,
): Promise<ReturnType<typeof rowToCategory> | null> {
	const client = pool ?? getPool()
	const sets: string[] = []
	const values: unknown[] = [id, userId]
	let paramIndex = 3
	if (data.name !== undefined) {
		sets.push(`name = $${paramIndex++}`)
		values.push(data.name)
	}
	if (data.direction !== undefined) {
		sets.push(`direction = $${paramIndex++}`)
		values.push(data.direction)
	}
	if (data.group_id !== undefined) {
		sets.push(`group_id = $${paramIndex++}`)
		values.push(data.group_id)
	}
	if (data.parent_category_id !== undefined) {
		sets.push(`parent_category_id = $${paramIndex++}`)
		values.push(data.parent_category_id)
	}
	if (data.description !== undefined) {
		sets.push(`description = $${paramIndex++}`)
		values.push(data.description)
	}
	if (data.is_active !== undefined) {
		sets.push(`is_active = $${paramIndex++}`)
		values.push(data.is_active)
	}
	if (sets.length === 0) {
		const existing = await getCategoryById(id, userId, pool)
		return existing
	}
	const result = await client.query<CategoryRow>(
		`UPDATE categories SET ${sets.join(', ')}
		 WHERE id = $1 AND user_id = $2
		 RETURNING id, user_id, group_id, parent_category_id, name, direction,
		           description, is_active`,
		values,
	)
	const row = result.rows[0]
	return row ? rowToCategory(row) : null
}
