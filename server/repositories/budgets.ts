/**
 * Data access for budgets table.
 */
import type { Pool } from 'pg'
import { getPool } from '../db/client.js'

export interface BudgetRow {
	id: string
	user_id: string
	name: string
	period_type: string
	start_date: Date
	end_date: Date
	base_currency_code: string
	notes: string | null
	created_at: Date
}

export interface CreateBudgetRow {
	user_id: string
	name: string
	period_type: string
	start_date: string
	end_date: string
	base_currency_code: string
	notes?: string | null
}

export interface UpdateBudgetRow {
	name?: string
	period_type?: string
	start_date?: string
	end_date?: string
	base_currency_code?: string
	notes?: string | null
}

function rowToBudget(row: BudgetRow) {
	return {
		id: String(row.id),
		userId: String(row.user_id),
		name: row.name,
		periodType: row.period_type,
		startDate: row.start_date instanceof Date ? row.start_date.toISOString().slice(0, 10) : String(row.start_date).slice(0, 10),
		endDate: row.end_date instanceof Date ? row.end_date.toISOString().slice(0, 10) : String(row.end_date).slice(0, 10),
		baseCurrencyCode: row.base_currency_code,
		notes: row.notes,
		createdAt: row.created_at.toISOString(),
	}
}

export async function listBudgetsByUser(
	userId: string,
	pool?: Pool,
): Promise<ReturnType<typeof rowToBudget>[]> {
	const client = pool ?? getPool()
	const result = await client.query<BudgetRow>(
		`SELECT id, user_id, name, period_type, start_date, end_date, base_currency_code, notes, created_at
		 FROM budgets WHERE user_id = $1 ORDER BY start_date DESC`,
		[userId],
	)
	return result.rows.map(rowToBudget)
}

export async function getBudgetById(
	id: string,
	userId: string,
	pool?: Pool,
): Promise<ReturnType<typeof rowToBudget> | null> {
	const client = pool ?? getPool()
	const result = await client.query<BudgetRow>(
		`SELECT id, user_id, name, period_type, start_date, end_date, base_currency_code, notes, created_at
		 FROM budgets WHERE id = $1 AND user_id = $2`,
		[id, userId],
	)
	const row = result.rows[0]
	return row ? rowToBudget(row) : null
}

export async function createBudget(
	data: CreateBudgetRow,
	pool?: Pool,
): Promise<ReturnType<typeof rowToBudget>> {
	const client = pool ?? getPool()
	const result = await client.query<BudgetRow>(
		`INSERT INTO budgets (user_id, name, period_type, start_date, end_date, base_currency_code, notes)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, user_id, name, period_type, start_date, end_date, base_currency_code, notes, created_at`,
		[
			data.user_id,
			data.name,
			data.period_type,
			data.start_date,
			data.end_date,
			data.base_currency_code,
			data.notes ?? null,
		],
	)
	return rowToBudget(result.rows[0])
}

export async function updateBudget(
	id: string,
	userId: string,
	data: UpdateBudgetRow,
	pool?: Pool,
): Promise<ReturnType<typeof rowToBudget> | null> {
	const client = pool ?? getPool()
	const result = await client.query<BudgetRow>(
		`UPDATE budgets SET
		 name = COALESCE($3, name),
		 period_type = COALESCE($4, period_type),
		 start_date = COALESCE($5, start_date),
		 end_date = COALESCE($6, end_date),
		 base_currency_code = COALESCE($7, base_currency_code),
		 notes = COALESCE($8, notes)
		 WHERE id = $1 AND user_id = $2
		 RETURNING id, user_id, name, period_type, start_date, end_date, base_currency_code, notes, created_at`,
		[
			id,
			userId,
			data.name,
			data.period_type,
			data.start_date,
			data.end_date,
			data.base_currency_code,
			data.notes,
		],
	)
	const row = result.rows[0]
	return row ? rowToBudget(row) : null
}

export async function deleteBudget(
	id: string,
	userId: string,
	pool?: Pool,
): Promise<boolean> {
	const client = pool ?? getPool()
	const result = await client.query(
		'DELETE FROM budgets WHERE id = $1 AND user_id = $2',
		[id, userId],
	)
	return (result.rowCount ?? 0) > 0
}

/**
 * Find or create a monthly budget for a given month and year.
 * Returns existing budget if found, otherwise creates a new one.
 */
export async function findOrCreateMonthlyBudget(
	userId: string,
	month: number, // 1-12
	year: number,
	baseCurrencyCode: string = 'USD',
	pool?: Pool,
): Promise<ReturnType<typeof rowToBudget>> {
	const client = pool ?? getPool()
	
	// Calculate start and end dates for the month
	const startDate = new Date(Date.UTC(year, month - 1, 1))
	const endDate = new Date(Date.UTC(year, month, 0)) // Last day of the month
	
	const startDateStr = startDate.toISOString().slice(0, 10)
	const endDateStr = endDate.toISOString().slice(0, 10)
	
	// Try to find existing budget for this month
	const existing = await client.query<BudgetRow>(
		`SELECT id, user_id, name, period_type, start_date, end_date, base_currency_code, notes, created_at
		 FROM budgets
		 WHERE user_id = $1 AND start_date = $2 AND end_date = $3 AND period_type = 'month'
		 ORDER BY created_at DESC
		 LIMIT 1`,
		[userId, startDateStr, endDateStr],
	)
	
	if (existing.rows.length > 0) {
		return rowToBudget(existing.rows[0])
	}
	
	// Create new budget
	const monthNames = [
		'January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December',
	]
	const budgetName = `${monthNames[month - 1]} ${year}`
	
	const result = await client.query<BudgetRow>(
		`INSERT INTO budgets (user_id, name, period_type, start_date, end_date, base_currency_code, notes)
		 VALUES ($1, $2, $3, $4, $5, $6, NULL)
		 RETURNING id, user_id, name, period_type, start_date, end_date, base_currency_code, notes, created_at`,
		[userId, budgetName, 'month', startDateStr, endDateStr, baseCurrencyCode],
	)
	
	return rowToBudget(result.rows[0])
}
