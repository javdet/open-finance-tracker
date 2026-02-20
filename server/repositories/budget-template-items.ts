/**
 * Data access for budget_template_items table.
 */
import type { Pool } from 'pg'
import { getPool } from '../db/client.js'

export interface BudgetTemplateItemRow {
	id: string
	template_id: string
	category_id: string
	planned_amount: string
	account_id: string | null
	created_at: Date
}

export interface CreateBudgetTemplateItemRow {
	template_id: string
	category_id: string
	planned_amount: number
	account_id?: string | null
}

function rowToBudgetTemplateItem(row: BudgetTemplateItemRow) {
	return {
		id: String(row.id),
		templateId: String(row.template_id),
		categoryId: String(row.category_id),
		plannedAmount: Number(row.planned_amount),
		accountId: row.account_id ? String(row.account_id) : null,
		createdAt: row.created_at.toISOString(),
	}
}

export async function listBudgetTemplateItemsByTemplateId(
	templateId: string,
	pool?: Pool,
): Promise<ReturnType<typeof rowToBudgetTemplateItem>[]> {
	const client = pool ?? getPool()
	const result = await client.query<BudgetTemplateItemRow>(
		`SELECT id, template_id, category_id, planned_amount, account_id, created_at
		 FROM budget_template_items WHERE template_id = $1 ORDER BY category_id`,
		[templateId],
	)
	return result.rows.map(rowToBudgetTemplateItem)
}

export async function createBudgetTemplateItem(
	data: CreateBudgetTemplateItemRow,
	pool?: Pool,
): Promise<ReturnType<typeof rowToBudgetTemplateItem>> {
	const client = pool ?? getPool()
	const result = await client.query<BudgetTemplateItemRow>(
		`INSERT INTO budget_template_items (template_id, category_id, planned_amount, account_id)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, template_id, category_id, planned_amount, account_id, created_at`,
		[
			data.template_id,
			data.category_id,
			data.planned_amount,
			data.account_id ?? null,
		],
	)
	return rowToBudgetTemplateItem(result.rows[0])
}

export interface UpdateBudgetTemplateItemRow {
	planned_amount?: number
	account_id?: string | null
}

export async function getBudgetTemplateItemById(
	id: string,
	templateId: string,
	pool?: Pool,
): Promise<ReturnType<typeof rowToBudgetTemplateItem> | null> {
	const client = pool ?? getPool()
	const result = await client.query<BudgetTemplateItemRow>(
		`SELECT id, template_id, category_id, planned_amount, account_id, created_at
		 FROM budget_template_items WHERE id = $1 AND template_id = $2`,
		[id, templateId],
	)
	const row = result.rows[0]
	return row ? rowToBudgetTemplateItem(row) : null
}

export async function updateBudgetTemplateItem(
	id: string,
	templateId: string,
	data: UpdateBudgetTemplateItemRow,
	pool?: Pool,
): Promise<ReturnType<typeof rowToBudgetTemplateItem> | null> {
	const client = pool ?? getPool()
	const result = await client.query<BudgetTemplateItemRow>(
		`UPDATE budget_template_items SET
		 planned_amount = COALESCE($3, planned_amount),
		 account_id = COALESCE($4, account_id)
		 WHERE id = $1 AND template_id = $2
		 RETURNING id, template_id, category_id, planned_amount, account_id, created_at`,
		[id, templateId, data.planned_amount, data.account_id],
	)
	const row = result.rows[0]
	return row ? rowToBudgetTemplateItem(row) : null
}

export async function deleteBudgetTemplateItem(
	id: string,
	templateId: string,
	pool?: Pool,
): Promise<boolean> {
	const client = pool ?? getPool()
	const result = await client.query(
		'DELETE FROM budget_template_items WHERE id = $1 AND template_id = $2',
		[id, templateId],
	)
	return (result.rowCount ?? 0) > 0
}
