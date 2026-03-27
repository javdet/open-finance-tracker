/**
 * Data access for wallet_watches table.
 * Tracks blockchain wallet addresses being monitored for on-chain
 * USDT/USDC transfers across Ethereum, Tron, and Solana.
 */
import type { Pool } from 'pg'
import { getPool } from '../db/client.js'

export interface WalletWatchRow {
	id: string
	user_id: string
	chain: string
	wallet_address: string
	account_id: string
	default_category_id: string | null
	is_active: boolean
	last_checked_at: Date | null
	last_block_number: string | null
	created_at: Date
}

export interface CreateWalletWatchRow {
	user_id: string
	chain: string
	wallet_address: string
	account_id: string
	default_category_id?: string | null
	is_active?: boolean
}

export interface UpdateWalletWatchRow {
	account_id?: string
	default_category_id?: string | null
	is_active?: boolean
}

const SELECT_COLS = `id, user_id, chain, wallet_address, account_id,
	default_category_id, is_active, last_checked_at, last_block_number,
	created_at`

function rowToWalletWatch(row: WalletWatchRow) {
	return {
		id: String(row.id),
		userId: String(row.user_id),
		chain: row.chain,
		walletAddress: row.wallet_address,
		accountId: String(row.account_id),
		defaultCategoryId: row.default_category_id
			? String(row.default_category_id)
			: null,
		isActive: row.is_active,
		lastCheckedAt: row.last_checked_at?.toISOString() ?? null,
		lastBlockNumber: row.last_block_number
			? Number(row.last_block_number)
			: null,
		createdAt: row.created_at.toISOString(),
	}
}

export type WalletWatch = ReturnType<typeof rowToWalletWatch>

/** All active watches across all users (for the background poller). */
export async function findActive(
	pool?: Pool,
): Promise<WalletWatch[]> {
	const client = pool ?? getPool()
	const result = await client.query<WalletWatchRow>(
		`SELECT ${SELECT_COLS}
		 FROM wallet_watches
		 WHERE is_active = TRUE
		 ORDER BY id`,
	)
	return result.rows.map(rowToWalletWatch)
}

export async function findById(
	id: string,
	userId: string,
	pool?: Pool,
): Promise<WalletWatch | null> {
	const client = pool ?? getPool()
	const result = await client.query<WalletWatchRow>(
		`SELECT ${SELECT_COLS}
		 FROM wallet_watches
		 WHERE id = $1 AND user_id = $2`,
		[id, userId],
	)
	const row = result.rows[0]
	return row ? rowToWalletWatch(row) : null
}

export async function listByUser(
	userId: string,
	options?: { limit?: number; offset?: number },
	pool?: Pool,
): Promise<{ rows: WalletWatch[]; total: number }> {
	const client = pool ?? getPool()
	const limit = Math.min(options?.limit ?? 50, 200)
	const offset = options?.offset ?? 0

	const countResult = await client.query<{ count: string }>(
		`SELECT COUNT(*)::text AS count
		 FROM wallet_watches WHERE user_id = $1`,
		[userId],
	)
	const total = parseInt(countResult.rows[0]?.count ?? '0', 10)

	const result = await client.query<WalletWatchRow>(
		`SELECT ${SELECT_COLS}
		 FROM wallet_watches
		 WHERE user_id = $1
		 ORDER BY created_at DESC
		 LIMIT $2 OFFSET $3`,
		[userId, limit, offset],
	)

	return { rows: result.rows.map(rowToWalletWatch), total }
}

export async function create(
	data: CreateWalletWatchRow,
	pool?: Pool,
): Promise<WalletWatch> {
	const client = pool ?? getPool()
	const result = await client.query<WalletWatchRow>(
		`INSERT INTO wallet_watches
		 (user_id, chain, wallet_address, account_id, default_category_id, is_active)
		 VALUES ($1, $2, $3, $4, $5, COALESCE($6, TRUE))
		 RETURNING ${SELECT_COLS}`,
		[
			data.user_id,
			data.chain,
			data.wallet_address,
			data.account_id,
			data.default_category_id ?? null,
			data.is_active ?? true,
		],
	)
	return rowToWalletWatch(result.rows[0])
}

export async function update(
	id: string,
	userId: string,
	data: UpdateWalletWatchRow,
	pool?: Pool,
): Promise<WalletWatch | null> {
	const client = pool ?? getPool()
	const sets: string[] = []
	const values: unknown[] = [id, userId]
	let idx = 3

	if (data.account_id !== undefined) {
		sets.push(`account_id = $${idx++}`)
		values.push(data.account_id)
	}
	if (data.default_category_id !== undefined) {
		sets.push(`default_category_id = $${idx++}`)
		values.push(data.default_category_id)
	}
	if (data.is_active !== undefined) {
		sets.push(`is_active = $${idx++}`)
		values.push(data.is_active)
	}

	if (sets.length === 0) {
		return findById(id, userId, pool)
	}

	const result = await client.query<WalletWatchRow>(
		`UPDATE wallet_watches SET ${sets.join(', ')}
		 WHERE id = $1 AND user_id = $2
		 RETURNING ${SELECT_COLS}`,
		values,
	)
	const row = result.rows[0]
	return row ? rowToWalletWatch(row) : null
}

export async function remove(
	id: string,
	userId: string,
	pool?: Pool,
): Promise<boolean> {
	const client = pool ?? getPool()
	const result = await client.query(
		'DELETE FROM wallet_watches WHERE id = $1 AND user_id = $2',
		[id, userId],
	)
	return (result.rowCount ?? 0) > 0
}

/** Update polling watermarks after a successful poll cycle. */
export async function updateLastChecked(
	id: string,
	lastBlockNumber: number,
	pool?: Pool,
): Promise<void> {
	const client = pool ?? getPool()
	await client.query(
		`UPDATE wallet_watches
		 SET last_checked_at = NOW(), last_block_number = $2
		 WHERE id = $1`,
		[id, lastBlockNumber],
	)
}
