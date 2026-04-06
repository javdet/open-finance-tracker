/**
 * Data access for password_reset_tokens table.
 */
import type { Pool } from 'pg'
import { getPool } from '../db/client.js'

export interface PasswordResetTokenRow {
	id: string
	user_id: string
	token_hash: string
	expires_at: Date
	used_at: Date | null
	created_at: Date
}

export async function createToken(
	userId: string,
	tokenHash: string,
	expiresAt: Date,
	pool?: Pool,
): Promise<PasswordResetTokenRow> {
	const client = pool ?? getPool()
	const result = await client.query<PasswordResetTokenRow>(
		`INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
		 VALUES ($1, $2, $3)
		 RETURNING id, user_id, token_hash, expires_at, used_at, created_at`,
		[userId, tokenHash, expiresAt],
	)
	return result.rows[0]
}

export async function findValidToken(
	tokenHash: string,
	pool?: Pool,
): Promise<PasswordResetTokenRow | null> {
	const client = pool ?? getPool()
	const result = await client.query<PasswordResetTokenRow>(
		`SELECT id, user_id, token_hash, expires_at, used_at, created_at
		 FROM password_reset_tokens
		 WHERE token_hash = $1
		   AND used_at IS NULL
		   AND expires_at > NOW()`,
		[tokenHash],
	)
	return result.rows[0] ?? null
}

export async function markUsed(
	tokenId: string,
	pool?: Pool,
): Promise<void> {
	const client = pool ?? getPool()
	await client.query(
		`UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`,
		[tokenId],
	)
}

export async function hasRecentToken(
	userId: string,
	withinMinutes: number,
	pool?: Pool,
): Promise<boolean> {
	const client = pool ?? getPool()
	const result = await client.query<{ count: string }>(
		`SELECT COUNT(*)::text AS count
		 FROM password_reset_tokens
		 WHERE user_id = $1
		   AND created_at > NOW() - INTERVAL '1 minute' * $2`,
		[userId, withinMinutes],
	)
	return Number(result.rows[0]?.count ?? 0) > 0
}

export async function deleteExpired(pool?: Pool): Promise<number> {
	const client = pool ?? getPool()
	const result = await client.query(
		`DELETE FROM password_reset_tokens
		 WHERE expires_at < NOW() AND used_at IS NOT NULL
		    OR expires_at < NOW() - INTERVAL '24 hours'`,
	)
	return result.rowCount ?? 0
}

export async function invalidateUserTokens(
	userId: string,
	pool?: Pool,
): Promise<void> {
	const client = pool ?? getPool()
	await client.query(
		`UPDATE password_reset_tokens
		 SET used_at = NOW()
		 WHERE user_id = $1 AND used_at IS NULL`,
		[userId],
	)
}
