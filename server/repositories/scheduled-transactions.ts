/**
 * Data access for the scheduled_transactions table.
 * Handles CRUD and recurrence-to-monthly-equivalent conversion.
 */
import type { Pool } from 'pg'
import { getPool } from '../db/client.js'

export type RecurrencePeriod =
	| 'daily'
	| 'weekly'
	| 'biweekly'
	| 'monthly'
	| 'quarterly'
	| 'yearly'

export interface ScheduledTransactionRow {
	id: string
	user_id: string
	name: string
	operation_type: string
	category_id: string | null
	account_id: string
	transfer_account_id: string | null
	amount: string
	currency_code: string
	recurrence_period: RecurrencePeriod
	start_date: string
	notify_payment: boolean
	is_active: boolean
	notes: string | null
	created_at: Date
	updated_at: Date
}

export interface CreateScheduledTransactionRow {
	user_id: string
	name: string
	operation_type: string
	category_id?: string | null
	account_id: string
	transfer_account_id?: string | null
	amount: number
	currency_code: string
	recurrence_period: RecurrencePeriod
	start_date: string
	notify_payment?: boolean
	is_active?: boolean
	notes?: string | null
}

export interface UpdateScheduledTransactionRow {
	name?: string
	category_id?: string | null
	account_id?: string
	transfer_account_id?: string | null
	amount?: number
	currency_code?: string
	recurrence_period?: RecurrencePeriod
	start_date?: string
	notify_payment?: boolean
	is_active?: boolean
	notes?: string | null
}

const MONTHLY_MULTIPLIERS: Record<RecurrencePeriod, number> = {
	daily: 30,
	weekly: 4.33,
	biweekly: 2.17,
	monthly: 1,
	quarterly: 1 / 3,
	yearly: 1 / 12,
}

const SELECT_COLUMNS = `
	id, user_id, name, operation_type, category_id, account_id,
	transfer_account_id, amount, currency_code, recurrence_period,
	start_date, notify_payment, is_active, notes, created_at, updated_at
`

function rowToScheduledTransaction(row: ScheduledTransactionRow) {
	return {
		id: String(row.id),
		userId: String(row.user_id),
		name: row.name,
		operationType: row.operation_type,
		categoryId: row.category_id ? String(row.category_id) : null,
		accountId: String(row.account_id),
		transferAccountId: row.transfer_account_id
			? String(row.transfer_account_id)
			: null,
		amount: Number(row.amount),
		currencyCode: row.currency_code,
		recurrencePeriod: row.recurrence_period,
		startDate: row.start_date,
		notifyPayment: row.notify_payment,
		isActive: row.is_active,
		notes: row.notes,
		createdAt: row.created_at.toISOString(),
		updatedAt: row.updated_at.toISOString(),
	}
}

/**
 * Convert an amount with a given recurrence period to its monthly equivalent.
 */
export function getMonthlyEquivalent(
	amount: number,
	recurrencePeriod: RecurrencePeriod,
): number {
	const multiplier = MONTHLY_MULTIPLIERS[recurrencePeriod]
	return amount * multiplier
}

/**
 * List all active scheduled transactions for a user.
 */
export async function listByUser(
	userId: string,
	pool?: Pool,
): Promise<ReturnType<typeof rowToScheduledTransaction>[]> {
	const client = pool ?? getPool()
	const result = await client.query<ScheduledTransactionRow>(
		`SELECT ${SELECT_COLUMNS}
		 FROM scheduled_transactions
		 WHERE user_id = $1 AND is_active = TRUE
		 ORDER BY created_at DESC`,
		[userId],
	)
	return result.rows.map(rowToScheduledTransaction)
}

/**
 * List scheduled transactions for a user filtered by a set of category IDs.
 * Used by budget enforcement to determine minimums per category.
 */
export async function listByCategoryIds(
	userId: string,
	categoryIds: string[],
	pool?: Pool,
): Promise<ReturnType<typeof rowToScheduledTransaction>[]> {
	if (categoryIds.length === 0) return []
	const client = pool ?? getPool()
	const placeholders = categoryIds
		.map((_, i) => `$${i + 2}`)
		.join(', ')
	const result = await client.query<ScheduledTransactionRow>(
		`SELECT ${SELECT_COLUMNS}
		 FROM scheduled_transactions
		 WHERE user_id = $1
		   AND is_active = TRUE
		   AND category_id IN (${placeholders})
		 ORDER BY created_at DESC`,
		[userId, ...categoryIds],
	)
	return result.rows.map(rowToScheduledTransaction)
}

/**
 * Get a single scheduled transaction by ID (scoped to user).
 */
export async function getById(
	id: string,
	userId: string,
	pool?: Pool,
): Promise<ReturnType<typeof rowToScheduledTransaction> | null> {
	const client = pool ?? getPool()
	const result = await client.query<ScheduledTransactionRow>(
		`SELECT ${SELECT_COLUMNS}
		 FROM scheduled_transactions
		 WHERE id = $1 AND user_id = $2`,
		[id, userId],
	)
	const row = result.rows[0]
	return row ? rowToScheduledTransaction(row) : null
}

/**
 * Insert a new scheduled transaction.
 */
export async function create(
	data: CreateScheduledTransactionRow,
	pool?: Pool,
): Promise<ReturnType<typeof rowToScheduledTransaction>> {
	const client = pool ?? getPool()
	const result = await client.query<ScheduledTransactionRow>(
		`INSERT INTO scheduled_transactions
		   (user_id, name, operation_type, category_id, account_id,
		    transfer_account_id, amount, currency_code, recurrence_period,
		    start_date, notify_payment, is_active, notes)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		 RETURNING ${SELECT_COLUMNS}`,
		[
			data.user_id,
			data.name,
			data.operation_type,
			data.category_id ?? null,
			data.account_id,
			data.transfer_account_id ?? null,
			data.amount,
			data.currency_code,
			data.recurrence_period,
			data.start_date,
			data.notify_payment ?? false,
			data.is_active ?? true,
			data.notes ?? null,
		],
	)
	return rowToScheduledTransaction(result.rows[0])
}

/**
 * Update a scheduled transaction (scoped to user).
 */
export async function update(
	id: string,
	userId: string,
	data: UpdateScheduledTransactionRow,
	pool?: Pool,
): Promise<ReturnType<typeof rowToScheduledTransaction> | null> {
	const client = pool ?? getPool()

	const sets: string[] = []
	const params: (string | number | boolean | null)[] = [id, userId]
	let paramIndex = 3

	if (data.name !== undefined) {
		sets.push(`name = $${paramIndex++}`)
		params.push(data.name)
	}
	if (data.category_id !== undefined) {
		sets.push(`category_id = $${paramIndex++}`)
		params.push(data.category_id)
	}
	if (data.account_id !== undefined) {
		sets.push(`account_id = $${paramIndex++}`)
		params.push(data.account_id)
	}
	if (data.transfer_account_id !== undefined) {
		sets.push(`transfer_account_id = $${paramIndex++}`)
		params.push(data.transfer_account_id)
	}
	if (data.amount !== undefined) {
		sets.push(`amount = $${paramIndex++}`)
		params.push(data.amount)
	}
	if (data.currency_code !== undefined) {
		sets.push(`currency_code = $${paramIndex++}`)
		params.push(data.currency_code)
	}
	if (data.recurrence_period !== undefined) {
		sets.push(`recurrence_period = $${paramIndex++}`)
		params.push(data.recurrence_period)
	}
	if (data.start_date !== undefined) {
		sets.push(`start_date = $${paramIndex++}`)
		params.push(data.start_date)
	}
	if (data.notify_payment !== undefined) {
		sets.push(`notify_payment = $${paramIndex++}`)
		params.push(data.notify_payment)
	}
	if (data.is_active !== undefined) {
		sets.push(`is_active = $${paramIndex++}`)
		params.push(data.is_active)
	}
	if (data.notes !== undefined) {
		sets.push(`notes = $${paramIndex++}`)
		params.push(data.notes)
	}

	if (sets.length === 0) {
		return getById(id, userId, pool)
	}

	sets.push('updated_at = NOW()')

	const result = await client.query<ScheduledTransactionRow>(
		`UPDATE scheduled_transactions
		 SET ${sets.join(', ')}
		 WHERE id = $1 AND user_id = $2
		 RETURNING ${SELECT_COLUMNS}`,
		params,
	)
	const row = result.rows[0]
	return row ? rowToScheduledTransaction(row) : null
}

/**
 * Delete a scheduled transaction (scoped to user).
 */
export async function deleteById(
	id: string,
	userId: string,
	pool?: Pool,
): Promise<boolean> {
	const client = pool ?? getPool()
	const result = await client.query(
		'DELETE FROM scheduled_transactions WHERE id = $1 AND user_id = $2',
		[id, userId],
	)
	return (result.rowCount ?? 0) > 0
}

/**
 * Get sum of monthly-equivalent amounts grouped by category_id.
 * Only considers active scheduled transactions. Amounts are returned
 * as absolute values so callers can compare against budget planned amounts.
 */
export async function getCategoryTotals(
	userId: string,
	pool?: Pool,
): Promise<{ categoryId: string; monthlyTotal: number }[]> {
	const client = pool ?? getPool()
	const result = await client.query<{
		category_id: string
		recurrence_period: RecurrencePeriod
		total_amount: string
	}>(
		`SELECT category_id::text AS category_id,
		        recurrence_period,
		        SUM(ABS(amount))::text AS total_amount
		 FROM scheduled_transactions
		 WHERE user_id = $1
		   AND is_active = TRUE
		   AND category_id IS NOT NULL
		 GROUP BY category_id, recurrence_period`,
		[userId],
	)

	const totals = new Map<string, number>()
	for (const row of result.rows) {
		const monthly = getMonthlyEquivalent(
			Number(row.total_amount),
			row.recurrence_period,
		)
		const existing = totals.get(row.category_id) ?? 0
		totals.set(row.category_id, existing + monthly)
	}

	return Array.from(totals.entries()).map(([categoryId, monthlyTotal]) => ({
		categoryId,
		monthlyTotal: Math.round(monthlyTotal * 100) / 100,
	}))
}
