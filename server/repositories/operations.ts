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
	transfer_amount: string | null
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
	transfer_amount?: number | null
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
	transfer_amount?: number | null
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
		transferAmount: row.transfer_amount ? Number(row.transfer_amount) : null,
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
		 category_id, amount, currency_code, amount_in_base, transfer_amount, notes, created_at
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
		 category_id, amount, currency_code, amount_in_base, transfer_amount, notes, created_at
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
		`INSERT INTO operations (user_id, operation_type, operation_time, account_id, transfer_account_id, category_id, amount, currency_code, amount_in_base, transfer_amount, notes)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		 RETURNING id, user_id, operation_type, operation_time, account_id, transfer_account_id, category_id, amount, currency_code, amount_in_base, transfer_amount, notes, created_at`,
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
			data.transfer_amount ?? null,
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

	const setClauses: string[] = []
	const params: unknown[] = [id, userId]
	let idx = 3

	function addField(column: string, value: unknown) {
		setClauses.push(`${column} = $${idx}`)
		params.push(value)
		idx += 1
	}

	if (data.operation_time !== undefined) {
		const opTime =
			typeof data.operation_time === 'string'
				? new Date(data.operation_time)
				: data.operation_time
		addField('operation_time', opTime)
	}
	if (data.account_id !== undefined) addField('account_id', data.account_id)
	if (data.transfer_account_id !== undefined)
		addField('transfer_account_id', data.transfer_account_id)
	if (data.category_id !== undefined) addField('category_id', data.category_id)
	if (data.amount !== undefined) addField('amount', data.amount)
	if (data.currency_code !== undefined)
		addField('currency_code', data.currency_code)
	if (data.amount_in_base !== undefined)
		addField('amount_in_base', data.amount_in_base)
	if (data.transfer_amount !== undefined)
		addField('transfer_amount', data.transfer_amount)
	if (data.notes !== undefined) addField('notes', data.notes)

	if (setClauses.length === 0) {
		return getOperationById(id, userId, pool)
	}

	const result = await client.query<OperationRow>(
		`UPDATE operations SET ${setClauses.join(', ')}
		 WHERE id = $1 AND user_id = $2
		 RETURNING id, user_id, operation_type, operation_time, account_id,
		 transfer_account_id, category_id, amount, currency_code, amount_in_base,
		 transfer_amount, notes, created_at`,
		params,
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
 * Sum actual amounts for operations in a date range, grouped by category.
 * Converts to the budget base currency using exchange_rates when
 * amount_in_base is NULL.
 *
 * Conversion logic per row:
 *   1. Use amount_in_base when present (already in base currency).
 *   2. If the operation currency matches baseCurrencyCode → ABS(amount).
 *   3. USD-pegged stablecoins (USDC, USDT) are treated as 1:1 with USD.
 *   4. Otherwise divide ABS(amount) by the exchange rate
 *      (base→counter, e.g. 1 USD = 33.5 THB → THB/33.5 = USD).
 *      Falls back to NULL (excluded from SUM) when no rate is found.
 */
export async function sumAmountInBaseByCategory(
	userId: string,
	fromTime: string,
	toTime: string,
	operationType: 'payment' | 'income',
	baseCurrencyCode: string,
	pool?: Pool,
): Promise<{ category_id: string; actual_amount: string }[]> {
	const client = pool ?? getPool()
	const result = await client.query<{
		category_id: string
		actual_amount: string
	}>(
		`SELECT o.category_id::text AS category_id,
		        COALESCE(SUM(
		          COALESCE(
		            o.amount_in_base,
		            CASE
		              WHEN o.currency_code = $5 THEN ABS(o.amount)
		              WHEN $5 = 'USD' AND o.currency_code IN ('USDC', 'USDT')
		                THEN ABS(o.amount)
		              WHEN $5 IN ('USDC', 'USDT') AND o.currency_code = 'USD'
		                THEN ABS(o.amount)
		              WHEN $5 IN ('USDC', 'USDT') AND o.currency_code IN ('USDC', 'USDT')
		                THEN ABS(o.amount)
		              ELSE ABS(o.amount) / NULLIF(
		                (SELECT er.rate
		                 FROM exchange_rates er
		                 WHERE er.base_currency_code = $5
		                   AND er.counter_currency_code = o.currency_code
		                   AND er.rate_date <= o.operation_time::date
		                 ORDER BY er.rate_date DESC
		                 LIMIT 1), 0)
		            END
		          )
		        ), 0)::text AS actual_amount
		 FROM operations o
		 WHERE o.user_id = $1
		   AND o.operation_time >= $2
		   AND o.operation_time < $3
		   AND o.operation_type = $4
		   AND o.category_id IS NOT NULL
		 GROUP BY o.category_id`,
		[userId, fromTime, toTime, operationType, baseCurrencyCode],
	)
	return result.rows
}

/**
 * Same as sumAmountInBaseByCategory but includes uncategorized operations
 * (category_id IS NULL). For use in dashboard charts. Returns amounts
 * in base currency (converted via exchange_rates when amount_in_base is null).
 */
export async function getCategoryTotalsInBase(
	userId: string,
	fromTime: string,
	toTime: string,
	operationType: 'payment' | 'income',
	baseCurrencyCode: string,
	pool?: Pool,
): Promise<{ category_id: string | null; actual_amount: string }[]> {
	const client = pool ?? getPool()
	const result = await client.query<{
		category_id: string | null
		actual_amount: string
	}>(
		`SELECT o.category_id::text AS category_id,
		        COALESCE(SUM(
		          COALESCE(
		            o.amount_in_base,
		            CASE
		              WHEN o.currency_code = $5 THEN ABS(o.amount)
		              WHEN $5 = 'USD' AND o.currency_code IN ('USDC', 'USDT')
		                THEN ABS(o.amount)
		              WHEN $5 IN ('USDC', 'USDT') AND o.currency_code = 'USD'
		                THEN ABS(o.amount)
		              WHEN $5 IN ('USDC', 'USDT') AND o.currency_code IN ('USDC', 'USDT')
		                THEN ABS(o.amount)
		              ELSE ABS(o.amount) / NULLIF(
		                (SELECT er.rate
		                 FROM exchange_rates er
		                 WHERE er.base_currency_code = $5
		                   AND er.counter_currency_code = o.currency_code
		                   AND er.rate_date <= o.operation_time::date
		                 ORDER BY er.rate_date DESC
		                 LIMIT 1), 0)
		            END
		          )
		        ), 0)::text AS actual_amount
		 FROM operations o
		 WHERE o.user_id = $1
		   AND o.operation_time >= $2
		   AND o.operation_time <= $3
		   AND o.operation_type = $4
		 GROUP BY o.category_id`,
		[userId, fromTime, toTime, operationType, baseCurrencyCode],
	)
	return result.rows
}

/** Category usage counts for the last N months (payment or income only). */
const POPULAR_CATEGORIES_MONTHS = 3
const POPULAR_CATEGORIES_LIMIT = 10

export async function getCategoryUsageCounts(
	userId: string,
	operationType: 'payment' | 'income',
	pool?: Pool,
): Promise<{ category_id: string }[]> {
	const client = pool ?? getPool()
	const fromTime = new Date()
	fromTime.setMonth(fromTime.getMonth() - POPULAR_CATEGORIES_MONTHS)
	const result = await client.query<{ category_id: string }>(
		`SELECT category_id::text AS category_id
		 FROM operations
		 WHERE user_id = $1
		   AND operation_type = $2
		   AND operation_time >= $3
		   AND category_id IS NOT NULL
		 GROUP BY category_id
		 ORDER BY COUNT(*) DESC
		 LIMIT $4`,
		[userId, operationType, fromTime.toISOString(), POPULAR_CATEGORIES_LIMIT],
	)
	return result.rows
}
