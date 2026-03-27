/**
 * Data access for blockchain_imports table.
 * Stores every on-chain transfer detected by the poller for auditing,
 * deduplication (unique constraint on chain + tx_hash), and linking
 * back to the created operation.
 */
import type { Pool } from 'pg'
import { getPool } from '../db/client.js'

export interface BlockchainImportRow {
	id: string
	user_id: string
	wallet_watch_id: string
	tx_hash: string
	chain: string
	from_address: string
	to_address: string
	token_symbol: string
	amount: string
	block_number: string
	block_timestamp: Date
	operation_id: string | null
	status: string
	error_message: string | null
	raw_data: unknown
	created_at: Date
}

export interface CreateBlockchainImportRow {
	user_id: string
	wallet_watch_id: string
	tx_hash: string
	chain: string
	from_address: string
	to_address: string
	token_symbol: string
	amount: number
	block_number: number
	block_timestamp: string
	operation_id?: string | null
	status: 'processed' | 'failed' | 'skipped'
	error_message?: string | null
	raw_data?: unknown
}

const SELECT_COLS = `id, user_id, wallet_watch_id, tx_hash, chain,
	from_address, to_address, token_symbol, amount, block_number,
	block_timestamp, operation_id, status, error_message, raw_data,
	created_at`

function rowToBlockchainImport(row: BlockchainImportRow) {
	return {
		id: String(row.id),
		userId: String(row.user_id),
		walletWatchId: String(row.wallet_watch_id),
		txHash: row.tx_hash,
		chain: row.chain,
		fromAddress: row.from_address,
		toAddress: row.to_address,
		tokenSymbol: row.token_symbol,
		amount: Number(row.amount),
		blockNumber: Number(row.block_number),
		blockTimestamp: row.block_timestamp.toISOString(),
		operationId: row.operation_id ? String(row.operation_id) : null,
		status: row.status,
		errorMessage: row.error_message,
		rawData: row.raw_data,
		createdAt: row.created_at.toISOString(),
	}
}

export type BlockchainImport = ReturnType<typeof rowToBlockchainImport>

/** Deduplication check: returns true if tx already imported for this chain. */
export async function existsByChainAndTxHash(
	chain: string,
	txHash: string,
	pool?: Pool,
): Promise<boolean> {
	const client = pool ?? getPool()
	const result = await client.query<{ exists: boolean }>(
		`SELECT EXISTS(
			SELECT 1 FROM blockchain_imports
			WHERE chain = $1 AND tx_hash = $2
		) AS exists`,
		[chain, txHash],
	)
	return result.rows[0]?.exists ?? false
}

export async function create(
	data: CreateBlockchainImportRow,
	pool?: Pool,
): Promise<BlockchainImport> {
	const client = pool ?? getPool()
	const result = await client.query<BlockchainImportRow>(
		`INSERT INTO blockchain_imports
		 (user_id, wallet_watch_id, tx_hash, chain, from_address, to_address,
		  token_symbol, amount, block_number, block_timestamp, operation_id,
		  status, error_message, raw_data)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		 RETURNING ${SELECT_COLS}`,
		[
			data.user_id,
			data.wallet_watch_id,
			data.tx_hash,
			data.chain,
			data.from_address,
			data.to_address,
			data.token_symbol,
			data.amount,
			data.block_number,
			data.block_timestamp,
			data.operation_id ?? null,
			data.status,
			data.error_message ?? null,
			data.raw_data ? JSON.stringify(data.raw_data) : null,
		],
	)
	return rowToBlockchainImport(result.rows[0])
}

export async function listByUser(
	userId: string,
	options?: { limit?: number; offset?: number },
	pool?: Pool,
): Promise<{ rows: BlockchainImport[]; total: number }> {
	const client = pool ?? getPool()
	const limit = Math.min(options?.limit ?? 50, 200)
	const offset = options?.offset ?? 0

	const countResult = await client.query<{ count: string }>(
		`SELECT COUNT(*)::text AS count
		 FROM blockchain_imports WHERE user_id = $1`,
		[userId],
	)
	const total = parseInt(countResult.rows[0]?.count ?? '0', 10)

	const result = await client.query<BlockchainImportRow>(
		`SELECT ${SELECT_COLS}
		 FROM blockchain_imports
		 WHERE user_id = $1
		 ORDER BY created_at DESC
		 LIMIT $2 OFFSET $3`,
		[userId, limit, offset],
	)

	return { rows: result.rows.map(rowToBlockchainImport), total }
}

export async function listByWalletWatch(
	walletWatchId: string,
	options?: { limit?: number; offset?: number },
	pool?: Pool,
): Promise<{ rows: BlockchainImport[]; total: number }> {
	const client = pool ?? getPool()
	const limit = Math.min(options?.limit ?? 50, 200)
	const offset = options?.offset ?? 0

	const countResult = await client.query<{ count: string }>(
		`SELECT COUNT(*)::text AS count
		 FROM blockchain_imports WHERE wallet_watch_id = $1`,
		[walletWatchId],
	)
	const total = parseInt(countResult.rows[0]?.count ?? '0', 10)

	const result = await client.query<BlockchainImportRow>(
		`SELECT ${SELECT_COLS}
		 FROM blockchain_imports
		 WHERE wallet_watch_id = $1
		 ORDER BY created_at DESC
		 LIMIT $2 OFFSET $3`,
		[walletWatchId, limit, offset],
	)

	return { rows: result.rows.map(rowToBlockchainImport), total }
}
