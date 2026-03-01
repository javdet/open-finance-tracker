/**
 * Data access for api_keys table.
 * Keys are stored as SHA-256 hashes; the raw key is returned only on creation.
 */
import crypto from 'crypto'
import type { Pool } from 'pg'
import { getPool } from '../db/client.js'

export interface ApiKeyRow {
	id: string
	user_id: string
	key_hash: string
	label: string
	is_active: boolean
	created_at: Date
}

function hashKey(raw: string): string {
	return crypto.createHash('sha256').update(raw).digest('hex')
}

function generateRawKey(): string {
	return `ftk_${crypto.randomBytes(32).toString('hex')}`
}

function rowToApiKey(row: ApiKeyRow) {
	return {
		id: String(row.id),
		userId: String(row.user_id),
		label: row.label,
		isActive: row.is_active,
		createdAt: row.created_at.toISOString(),
	}
}

/**
 * Creates a new API key for the given user.
 * Returns the mapped key object **plus** the raw key (shown once).
 */
export async function createApiKey(
	userId: string,
	label: string,
	pool?: Pool,
) {
	const client = pool ?? getPool()
	const rawKey = generateRawKey()
	const keyHash = hashKey(rawKey)

	const result = await client.query<ApiKeyRow>(
		`INSERT INTO api_keys (user_id, key_hash, label)
		 VALUES ($1, $2, $3)
		 RETURNING id, user_id, key_hash, label, is_active, created_at`,
		[userId, keyHash, label],
	)

	return {
		...rowToApiKey(result.rows[0]),
		rawKey,
	}
}

export async function listApiKeysByUser(
	userId: string,
	pool?: Pool,
) {
	const client = pool ?? getPool()
	const result = await client.query<ApiKeyRow>(
		`SELECT id, user_id, key_hash, label, is_active, created_at
		 FROM api_keys
		 WHERE user_id = $1 AND is_active = TRUE
		 ORDER BY created_at DESC`,
		[userId],
	)
	return result.rows.map(rowToApiKey)
}

/**
 * Resolves an active API key by its raw value.
 * Returns the key row (with user_id) or null.
 */
export async function findByRawKey(
	rawKey: string,
	pool?: Pool,
): Promise<ReturnType<typeof rowToApiKey> | null> {
	const client = pool ?? getPool()
	const keyHash = hashKey(rawKey)
	const result = await client.query<ApiKeyRow>(
		`SELECT id, user_id, key_hash, label, is_active, created_at
		 FROM api_keys
		 WHERE key_hash = $1 AND is_active = TRUE
		 LIMIT 1`,
		[keyHash],
	)
	const row = result.rows[0]
	return row ? rowToApiKey(row) : null
}

/**
 * Soft-revokes an API key (sets is_active = false).
 */
export async function revokeApiKey(
	id: string,
	userId: string,
	pool?: Pool,
): Promise<boolean> {
	const client = pool ?? getPool()
	const result = await client.query(
		`UPDATE api_keys
		 SET is_active = FALSE
		 WHERE id = $1 AND user_id = $2 AND is_active = TRUE`,
		[id, userId],
	)
	return (result.rowCount ?? 0) > 0
}
