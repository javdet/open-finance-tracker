/**
 * Data access for operations table (partitioned by operation_time).
 */
import type { Pool } from 'pg'
import { getPool } from '../db/client.js'

export interface OperationRow {
	id: string
	user_id: string
	operation_type: string
	operation_time: Date
	account_id: string
	transfer_account_id: string | null
	category_id: string | null
	amount: string
	currency_code: string
	amount_in_base: string | null
	notes: string | null
	created_at: Date
}

export interface CreateOperationRow {
	user_id: string
	operation_type: string
	operation_time: Date | string
	account_id: string
	transfer_account_id?: string | null
	category_id?: string | null
	amount: number
	currency_code: string
	amount_in_base?: number | null
	notes?: string | null
}

export interface UpdateOperationRow {
	operation_time?: Date | string
	account_id?: string
	transfer_account_id?: string | null
	category_id?: string | null
	amount?: number
	currency_code?: string
	amount_in_base?: number | null
	notes?: string | null
}

export interface ListOperationsOptions {
	userId: string
	fromTime?: string
	toTime?: string
	accountId?: string
	categoryId?: string
	operationType?: string
	limit?: number
	offset?: number
}

function rowToOperation(row: OperationRow) {
	return {
		id: String(row.id),
		userId: String(row.user_id),
		operationType: row.operation_type,
		operationTime: row.operation_time.toISOString(),
		accountId: String(row.account_id),
		transferAccountId: row.transfer_account_id
			? String(row.transfer_account_id)
			: null,
		categoryId: row.category_id ? String(row.category_id) : null,
		amount: Number(row.amount),
		currencyCode: row.currency_code,
		amountInBase: row.amount_in_base ? Number(row.amount_in_base) : null,
		notes: row.notes,
		createdAt: row.created_at.toISOString(),
	}
}

export async function listOperations(
	options: ListOperationsOptions,
	pool?: Pool,
): Promise<{ rows: ReturnType<typeof rowToOperation>[]; total: number }> {
	const client = pool ?? getPool()
	const conditions: string[] = ['user_id = $1']
	const params: (string | number)[] = [options.userId]
	let paramIndex = 2

	if (options.fromTime) {
		conditions.push(`operation_time >= $${paramIndex}`)
		params.push(options.fromTime)
		paramIndex += 1
	}
	if (options.toTime) {
		conditions.push(`operation_time <= $${paramIndex}`)
		params.push(options.toTime)
		paramIndex += 1
	}
	if (options.accountId) {
		conditions.push(`(account_id = $${paramIndex} OR transfer_account_id = $${paramIndex})`)
		params.push(options.accountId)
		paramIndex += 1
	}
	if (options.categoryId) {
		conditions.push(`category_id = $${paramIndex}`)
		params.push(options.categoryId)
		paramIndex += 1
	}
	if (options.operationType) {
		conditions.push(`operation_type = $${paramIndex}`)
		params.push(options.operationType)
		paramIndex += 1
	}

	const whereClause = conditions.join(' AND ')
	const limit = Math.min(options.limit ?? 100, 500)
	const offset = options.offset ?? 0

	const countResult = await client.query<{ count: string }>(
		`SELECT COUNT(*)::text AS count FROM operations WHERE ${whereClause}`,
		params,
	)
	const total = parseInt(countResult.rows[0]?.count ?? '0', 10)

	params.push(limit, offset)
	const result = await client.query<OperationRow>(
		`SELECT id, user_id, operation_type, operation_time, account_id, transfer_account_id,
		 category_id, amount, currency_code, amount_in_base, notes, created_at
		 FROM operations WHERE ${whereClause}
		 ORDER BY operation_time DESC, id DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
		params,
	)

	return { rows: result.rows.map(rowToOperation), total }
}

export async function getOperationById(
	id: string,
	userId: string,
	pool?: Pool,
): Promise<ReturnType<typeof rowToOperation> | null> {
	const client = pool ?? getPool()
	const result = await client.query<OperationRow>(
		`SELECT id, user_id, operation_type, operation_time, account_id, transfer_account_id,
		 category_id, amount, currency_code, amount_in_base, notes, created_at
		 FROM operations WHERE id = $1 AND user_id = $2`,
		[id, userId],
	)
	const row = result.rows[0]
	return row ? rowToOperation(row) : null
}

export async function createOperation(
	data: CreateOperationRow,
	pool?: Pool,
): Promise<ReturnType<typeof rowToOperation>> {
	const client = pool ?? getPool()
	const opTime =
		typeof data.operation_time === 'string'
			? new Date(data.operation_time)
			: data.operation_time
	const result = await client.query<OperationRow>(
		`INSERT INTO operations (user_id, operation_type, operation_time, account_id, transfer_account_id, category_id, amount, currency_code, amount_in_base, notes)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		 RETURNING id, user_id, operation_type, operation_time, account_id, transfer_account_id, category_id, amount, currency_code, amount_in_base, notes, created_at`,
		[
			data.user_id,
			data.operation_type,
			opTime,
			data.account_id,
			data.transfer_account_id ?? null,
			data.category_id ?? null,
			data.amount,
			data.currency_code,
			data.amount_in_base ?? null,
			data.notes ?? null,
		],
	)
	return rowToOperation(result.rows[0])
}

export async function updateOperation(
	id: string,
	userId: string,
	data: UpdateOperationRow,
	pool?: Pool,
): Promise<ReturnType<typeof rowToOperation> | null> {
	const client = pool ?? getPool()
	const opTime = data.operation_time
		? typeof data.operation_time === 'string'
			? new Date(data.operation_time)
			: data.operation_time
		: undefined
	const result = await client.query<OperationRow>(
		`UPDATE operations SET
		 operation_time = COALESCE($3, operation_time),
		 account_id = COALESCE($4, account_id),
		 transfer_account_id = $5,
		 category_id = $6,
		 amount = COALESCE($7, amount),
		 currency_code = COALESCE($8, currency_code),
		 amount_in_base = $9,
		 notes = COALESCE($10, notes)
		 WHERE id = $1 AND user_id = $2
		 RETURNING id, user_id, operation_type, operation_time, account_id, transfer_account_id, category_id, amount, currency_code, amount_in_base, notes, created_at`,
		[
			id,
			userId,
			opTime,
			data.account_id,
			data.transfer_account_id,
			data.category_id,
			data.amount,
			data.currency_code,
			data.amount_in_base,
			data.notes,
		],
	)
	const row = result.rows[0]
	return row ? rowToOperation(row) : null
}

export async function deleteOperation(
	id: string,
	userId: string,
	pool?: Pool,
): Promise<boolean> {
	const client = pool ?? getPool()
	const result = await client.query(
		'DELETE FROM operations WHERE id = $1 AND user_id = $2',
		[id, userId],
	)
	return (result.rowCount ?? 0) > 0
}

/**
 * Sum amount_in_base for operations in a date range, optionally by category.
 * Used for budget vs actual: filter operation_type = 'payment' for expenses.
 */
export async function sumAmountInBaseByCategory(
	userId: string,
	fromTime: string,
	toTime: string,
	operationType: 'payment' | 'income',
	pool?: Pool,
): Promise<{ category_id: string; actual_amount: string }[]> {
	const client = pool ?? getPool()
	const result = await client.query<{ category_id: string; actual_amount: string }>(
		`SELECT category_id::text AS category_id, COALESCE(SUM(amount_in_base), 0)::text AS actual_amount
		 FROM operations
		 WHERE user_id = $1 AND operation_time >= $2 AND operation_time < $3 AND operation_type = $4 AND category_id IS NOT NULL
		 GROUP BY category_id`,
		[userId, fromTime, toTime, operationType],
	)
	return result.rows
}
