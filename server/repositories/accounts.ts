/**
 * Data access for accounts table (schema: accounts).
 */
import type { Pool } from 'pg'
import { getPool } from '../db/client.js'

export interface AccountRow {
	id: string
	user_id: string
	name: string
	account_type: string
	description: string | null
	currency_code: string
	initial_balance: string
	is_active: boolean
	created_at: Date
	balance?: string
}

export interface CreateAccountRow {
	user_id: string
	name: string
	account_type: string
	description?: string | null
	currency_code: string
	initial_balance?: number
	is_active?: boolean
}

export interface UpdateAccountRow {
	name?: string
	account_type?: string
	description?: string | null
	currency_code?: string
	initial_balance?: number
	is_active?: boolean
}

function rowToAccount(row: AccountRow) {
	const balance =
		row.balance !== undefined ? Number(row.balance) : Number(row.initial_balance)
	return {
		id: String(row.id),
		userId: String(row.user_id),
		name: row.name,
		accountType: row.account_type,
		description: row.description,
		currencyCode: row.currency_code,
		initialBalance: Number(row.initial_balance),
		balance,
		isActive: row.is_active,
		createdAt: row.created_at.toISOString(),
	}
}

export async function listAccountsByUser(
	userId: string,
	pool?: Pool,
): Promise<ReturnType<typeof rowToAccount>[]> {
	const client = pool ?? getPool()
	const result = await client.query<AccountRow>(
		`SELECT a.id, a.user_id, a.name, a.account_type, a.description, a.currency_code,
		 a.initial_balance, a.is_active, a.created_at,
		 (a.initial_balance + COALESCE(out_sum.total, 0) + COALESCE(in_sum.total, 0)) AS balance
		 FROM accounts a
		 LEFT JOIN (
		   SELECT account_id, SUM(amount)::numeric AS total
		   FROM operations WHERE user_id = $1 GROUP BY account_id
		 ) out_sum ON out_sum.account_id = a.id
		 LEFT JOIN (
		   SELECT transfer_account_id AS account_id, SUM(COALESCE(transfer_amount, -amount))::numeric AS total
		   FROM operations WHERE transfer_account_id IS NOT NULL AND user_id = $1 GROUP BY transfer_account_id
		 ) in_sum ON in_sum.account_id = a.id
		 WHERE a.user_id = $1 ORDER BY a.name`,
		[userId],
	)
	return result.rows.map(rowToAccount)
}

export async function getAccountById(
	id: string,
	userId: string,
	pool?: Pool,
): Promise<ReturnType<typeof rowToAccount> | null> {
	const client = pool ?? getPool()
	const result = await client.query<AccountRow>(
		`SELECT a.id, a.user_id, a.name, a.account_type, a.description, a.currency_code,
		 a.initial_balance, a.is_active, a.created_at,
		 (a.initial_balance + COALESCE(out_sum.total, 0) + COALESCE(in_sum.total, 0)) AS balance
		 FROM accounts a
		 LEFT JOIN (
		   SELECT account_id, SUM(amount)::numeric AS total
		   FROM operations WHERE user_id = $2 AND account_id = $1 GROUP BY account_id
		 ) out_sum ON out_sum.account_id = a.id
		 LEFT JOIN (
		   SELECT transfer_account_id AS account_id, SUM(COALESCE(transfer_amount, -amount))::numeric AS total
		   FROM operations WHERE transfer_account_id = $1 AND user_id = $2 GROUP BY transfer_account_id
		 ) in_sum ON in_sum.account_id = a.id
		 WHERE a.id = $1 AND a.user_id = $2`,
		[id, userId],
	)
	const row = result.rows[0]
	return row ? rowToAccount(row) : null
}

export async function createAccount(
	data: CreateAccountRow,
	pool?: Pool,
): Promise<ReturnType<typeof rowToAccount>> {
	const client = pool ?? getPool()
	const result = await client.query<AccountRow>(
		`INSERT INTO accounts (user_id, name, account_type, description, currency_code, initial_balance, is_active)
		 VALUES ($1, $2, $3, $4, $5, COALESCE($6, 0), COALESCE($7, true))
		 RETURNING id, user_id, name, account_type, description, currency_code, initial_balance, is_active, created_at`,
		[
			data.user_id,
			data.name,
			data.account_type,
			data.description ?? null,
			data.currency_code,
			data.initial_balance ?? 0,
			data.is_active ?? true,
		],
	)
	return rowToAccount(result.rows[0])
}

export async function updateAccount(
	id: string,
	userId: string,
	data: UpdateAccountRow,
	pool?: Pool,
): Promise<ReturnType<typeof rowToAccount> | null> {
	const client = pool ?? getPool()
	const result = await client.query<AccountRow>(
		`UPDATE accounts SET
		 name = COALESCE($3, name),
		 account_type = COALESCE($4, account_type),
		 description = COALESCE($5, description),
		 currency_code = COALESCE($6, currency_code),
		 initial_balance = COALESCE($7, initial_balance),
		 is_active = COALESCE($8, is_active)
		 WHERE id = $1 AND user_id = $2
		 RETURNING id, user_id, name, account_type, description, currency_code, initial_balance, is_active, created_at`,
		[
			id,
			userId,
			data.name,
			data.account_type,
			data.description,
			data.currency_code,
			data.initial_balance,
			data.is_active,
		],
	)
	const row = result.rows[0]
	return row ? rowToAccount(row) : null
}

export async function deleteAccount(
	id: string,
	userId: string,
	pool?: Pool,
): Promise<boolean> {
	const client = pool ?? getPool()
	const result = await client.query(
		'DELETE FROM accounts WHERE id = $1 AND user_id = $2',
		[id, userId],
	)
	return (result.rowCount ?? 0) > 0
}

export interface AccountBalanceAtDate {
	id: string
	name: string
	currencyCode: string
	balance: number
}

/**
 * Returns active accounts with their balance as of a given date (exclusive).
 * Balance = initial_balance + operations where operation_time < asOfTime.
 */
export async function listAccountBalancesAtDate(
	userId: string,
	asOfTime: string,
	pool?: Pool,
): Promise<AccountBalanceAtDate[]> {
	const client = pool ?? getPool()
	const result = await client.query<{
		id: string
		name: string
		currency_code: string
		balance: string
	}>(
		`SELECT a.id::text AS id, a.name, a.currency_code,
		 (a.initial_balance
		  + COALESCE((
		    SELECT SUM(o.amount)::numeric FROM operations o
		    WHERE o.user_id = $1 AND o.account_id = a.id AND o.operation_time < $2
		  ), 0)
		  + COALESCE((
		    SELECT SUM(COALESCE(o.transfer_amount, -o.amount))::numeric FROM operations o
		    WHERE o.user_id = $1 AND o.transfer_account_id = a.id
		      AND o.operation_time < $2
		  ), 0)
		 ) AS balance
		 FROM accounts a
		 WHERE a.user_id = $1 AND a.is_active = true
		 ORDER BY a.name`,
		[userId, asOfTime],
	)
	return result.rows.map((r) => ({
		id: r.id,
		name: r.name,
		currencyCode: r.currency_code,
		balance: Number(r.balance),
	}))
}
