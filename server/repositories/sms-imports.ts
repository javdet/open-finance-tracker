/**
 * Data access for sms_imports table.
 * Stores raw SMS messages for auditing, debugging, and deduplication.
 */
import type { Pool } from 'pg'
import { getPool } from '../db/client.js'

export interface SmsImportRow {
	id: string
	user_id: string
	raw_message: string
	sender: string | null
	received_at: Date | null
	parser_used: string | null
	parsed_data: Record<string, unknown> | null
	operation_id: string | null
	status: string
	error_message: string | null
	message_hash: string
	created_at: Date
}

export interface CreateSmsImportRow {
	user_id: string
	raw_message: string
	sender?: string | null
	received_at?: Date | string | null
	parser_used?: string | null
	parsed_data?: Record<string, unknown> | null
	operation_id?: string | null
	status: 'pending' | 'processed' | 'failed' | 'duplicate' | 'skipped'
	error_message?: string | null
	message_hash: string
}

function rowToSmsImport(row: SmsImportRow) {
	return {
		id: String(row.id),
		userId: String(row.user_id),
		rawMessage: row.raw_message,
		sender: row.sender,
		receivedAt: row.received_at?.toISOString() ?? null,
		parserUsed: row.parser_used,
		parsedData: row.parsed_data,
		operationId: row.operation_id ? String(row.operation_id) : null,
		status: row.status,
		errorMessage: row.error_message,
		messageHash: row.message_hash,
		createdAt: row.created_at.toISOString(),
	}
}

export type SmsImport = ReturnType<typeof rowToSmsImport>

const SELECT_COLS = `id, user_id, raw_message, sender, received_at,
	parser_used, parsed_data, operation_id, status, error_message,
	message_hash, created_at`

/**
 * Check whether a message with the given hash already exists for a user.
 * Returns the existing record or null.
 */
export async function findByHash(
	userId: string,
	messageHash: string,
	pool?: Pool,
): Promise<SmsImport | null> {
	const client = pool ?? getPool()
	const result = await client.query<SmsImportRow>(
		`SELECT ${SELECT_COLS}
		 FROM sms_imports
		 WHERE user_id = $1 AND message_hash = $2`,
		[userId, messageHash],
	)
	const row = result.rows[0]
	return row ? rowToSmsImport(row) : null
}

export async function create(
	data: CreateSmsImportRow,
	pool?: Pool,
): Promise<SmsImport> {
	const client = pool ?? getPool()
	const result = await client.query<SmsImportRow>(
		`INSERT INTO sms_imports
		 (user_id, raw_message, sender, received_at, parser_used,
		  parsed_data, operation_id, status, error_message, message_hash)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		 RETURNING ${SELECT_COLS}`,
		[
			data.user_id,
			data.raw_message,
			data.sender ?? null,
			data.received_at ?? null,
			data.parser_used ?? null,
			data.parsed_data ? JSON.stringify(data.parsed_data) : null,
			data.operation_id ?? null,
			data.status,
			data.error_message ?? null,
			data.message_hash,
		],
	)
	return rowToSmsImport(result.rows[0])
}

export async function listByUser(
	userId: string,
	options?: { limit?: number; offset?: number },
	pool?: Pool,
): Promise<{ rows: SmsImport[]; total: number }> {
	const client = pool ?? getPool()
	const limit = Math.min(options?.limit ?? 50, 200)
	const offset = options?.offset ?? 0

	const countResult = await client.query<{ count: string }>(
		`SELECT COUNT(*)::text AS count
		 FROM sms_imports WHERE user_id = $1`,
		[userId],
	)
	const total = parseInt(countResult.rows[0]?.count ?? '0', 10)

	const result = await client.query<SmsImportRow>(
		`SELECT ${SELECT_COLS}
		 FROM sms_imports
		 WHERE user_id = $1
		 ORDER BY created_at DESC
		 LIMIT $2 OFFSET $3`,
		[userId, limit, offset],
	)

	return { rows: result.rows.map(rowToSmsImport), total }
}
