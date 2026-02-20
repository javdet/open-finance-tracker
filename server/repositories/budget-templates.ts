/**
 * Data access for budget_templates table.
 */
import type { Pool } from 'pg'
import { getPool } from '../db/client.js'

export interface BudgetTemplateRow {
	id: string
	user_id: string
	name: string
	base_currency_code: string
	created_at: Date
}

export interface CreateBudgetTemplateRow {
	user_id: string
	name: string
	base_currency_code: string
}

export interface UpdateBudgetTemplateRow {
	name?: string
	base_currency_code?: string
}

function rowToBudgetTemplate(row: BudgetTemplateRow) {
	return {
		id: String(row.id),
		userId: String(row.user_id),
		name: row.name,
		baseCurrencyCode: row.base_currency_code,
		createdAt: row.created_at.toISOString(),
	}
}

export async function listBudgetTemplatesByUser(
	userId: string,
	pool?: Pool,
): Promise<ReturnType<typeof rowToBudgetTemplate>[]> {
	const client = pool ?? getPool()
	const result = await client.query<BudgetTemplateRow>(
		`SELECT id, user_id, name, base_currency_code, created_at
		 FROM budget_templates WHERE user_id = $1 ORDER BY name`,
		[userId],
	)
	return result.rows.map(rowToBudgetTemplate)
}

export async function getBudgetTemplateById(
	id: string,
	userId: string,
	pool?: Pool,
): Promise<ReturnType<typeof rowToBudgetTemplate> | null> {
	const client = pool ?? getPool()
	const result = await client.query<BudgetTemplateRow>(
		`SELECT id, user_id, name, base_currency_code, created_at
		 FROM budget_templates WHERE id = $1 AND user_id = $2`,
		[id, userId],
	)
	const row = result.rows[0]
	return row ? rowToBudgetTemplate(row) : null
}

export async function createBudgetTemplate(
	data: CreateBudgetTemplateRow,
	pool?: Pool,
): Promise<ReturnType<typeof rowToBudgetTemplate>> {
	const client = pool ?? getPool()
	const result = await client.query<BudgetTemplateRow>(
		`INSERT INTO budget_templates (user_id, name, base_currency_code)
		 VALUES ($1, $2, $3)
		 RETURNING id, user_id, name, base_currency_code, created_at`,
		[data.user_id, data.name, data.base_currency_code],
	)
	return rowToBudgetTemplate(result.rows[0])
}

export async function updateBudgetTemplate(
	id: string,
	userId: string,
	data: UpdateBudgetTemplateRow,
	pool?: Pool,
): Promise<ReturnType<typeof rowToBudgetTemplate> | null> {
	const client = pool ?? getPool()
	const result = await client.query<BudgetTemplateRow>(
		`UPDATE budget_templates SET
		 name = COALESCE($3, name),
		 base_currency_code = COALESCE($4, base_currency_code)
		 WHERE id = $1 AND user_id = $2
		 RETURNING id, user_id, name, base_currency_code, created_at`,
		[id, userId, data.name, data.base_currency_code],
	)
	const row = result.rows[0]
	return row ? rowToBudgetTemplate(row) : null
}

export async function deleteBudgetTemplate(
	id: string,
	userId: string,
	pool?: Pool,
): Promise<boolean> {
	const client = pool ?? getPool()
	const result = await client.query(
		'DELETE FROM budget_templates WHERE id = $1 AND user_id = $2',
		[id, userId],
	)
	return (result.rowCount ?? 0) > 0
}
