/**
 * Data access for budget_items table.
 */
import type { Pool } from 'pg'
import { getPool } from '../db/client.js'

export interface BudgetItemRow {
	id: string
	budget_id: string
	category_id: string
	planned_amount: string
	account_id: string | null
	created_at: Date
}

export interface CreateBudgetItemRow {
	budget_id: string
	category_id: string
	planned_amount: number
	account_id?: string | null
}

function rowToBudgetItem(row: BudgetItemRow) {
	return {
		id: String(row.id),
		budgetId: String(row.budget_id),
		categoryId: String(row.category_id),
		plannedAmount: Number(row.planned_amount),
		accountId: row.account_id ? String(row.account_id) : null,
		createdAt: row.created_at.toISOString(),
	}
}

export async function listBudgetItemsByBudgetId(
	budgetId: string,
	pool?: Pool,
): Promise<ReturnType<typeof rowToBudgetItem>[]> {
	const client = pool ?? getPool()
	const result = await client.query<BudgetItemRow>(
		`SELECT id, budget_id, category_id, planned_amount, account_id, created_at
		 FROM budget_items WHERE budget_id = $1 ORDER BY category_id`,
		[budgetId],
	)
	return result.rows.map(rowToBudgetItem)
}

export async function createBudgetItem(
	data: CreateBudgetItemRow,
	pool?: Pool,
): Promise<ReturnType<typeof rowToBudgetItem>> {
	const client = pool ?? getPool()
	const result = await client.query<BudgetItemRow>(
		`INSERT INTO budget_items (budget_id, category_id, planned_amount, account_id)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, budget_id, category_id, planned_amount, account_id, created_at`,
		[
			data.budget_id,
			data.category_id,
			data.planned_amount,
			data.account_id ?? null,
		],
	)
	return rowToBudgetItem(result.rows[0])
}

export interface UpdateBudgetItemRow {
	planned_amount?: number
	account_id?: string | null
}

export async function getBudgetItemById(
	id: string,
	budgetId: string,
	pool?: Pool,
): Promise<ReturnType<typeof rowToBudgetItem> | null> {
	const client = pool ?? getPool()
	const result = await client.query<BudgetItemRow>(
		`SELECT id, budget_id, category_id, planned_amount, account_id, created_at
		 FROM budget_items WHERE id = $1 AND budget_id = $2`,
		[id, budgetId],
	)
	const row = result.rows[0]
	return row ? rowToBudgetItem(row) : null
}

export async function updateBudgetItem(
	id: string,
	budgetId: string,
	data: UpdateBudgetItemRow,
	pool?: Pool,
): Promise<ReturnType<typeof rowToBudgetItem> | null> {
	const client = pool ?? getPool()
	const result = await client.query<BudgetItemRow>(
		`UPDATE budget_items SET
		 planned_amount = COALESCE($3, planned_amount),
		 account_id = COALESCE($4, account_id)
		 WHERE id = $1 AND budget_id = $2
		 RETURNING id, budget_id, category_id, planned_amount, account_id, created_at`,
		[id, budgetId, data.planned_amount, data.account_id],
	)
	const row = result.rows[0]
	return row ? rowToBudgetItem(row) : null
}

export async function deleteBudgetItem(
	id: string,
	budgetId: string,
	pool?: Pool,
): Promise<boolean> {
	const client = pool ?? getPool()
	const result = await client.query(
		'DELETE FROM budget_items WHERE id = $1 AND budget_id = $2',
		[id, budgetId],
	)
	return (result.rowCount ?? 0) > 0
}

/**
 * Get budget items with category names for a budget (for budget vs actual report).
 */
export async function getBudgetItemsWithCategoryNames(
	budgetId: string,
	pool?: Pool,
): Promise<{ category_id: string; category_name: string; planned_amount: string; category_direction: string }[]> {
	const client = pool ?? getPool()
	const result = await client.query<{
		category_id: string
		category_name: string
		planned_amount: string
		category_direction: string
	}>(
		`SELECT bi.category_id::text, c.name AS category_name, bi.planned_amount::text, c.direction AS category_direction
		 FROM budget_items bi
		 JOIN categories c ON c.id = bi.category_id
		 WHERE bi.budget_id = $1`,
		[budgetId],
	)
	return result.rows.map((r) => ({
		category_id: r.category_id,
		category_name: r.category_name,
		planned_amount: r.planned_amount,
		category_direction: r.category_direction,
	}))
}
