/**
 * Data access for users table (schema: users).
 */
import type { Pool } from 'pg'
import { getPool } from '../db/client.js'

export interface UserRow {
	id: string
	email: string
	password_hash: string | null
	external_auth_id: string | null
	base_currency_code: string
}

export async function findByEmail(
	email: string,
	pool?: Pool,
): Promise<UserRow | null> {
	const client = pool ?? getPool()
	const result = await client.query<UserRow>(
		`SELECT id, email, password_hash, external_auth_id, base_currency_code
		 FROM users
		 WHERE LOWER(email) = LOWER($1)`,
		[email],
	)
	return result.rows[0] ?? null
}

export async function findById(
	id: string,
	pool?: Pool,
): Promise<UserRow | null> {
	const client = pool ?? getPool()
	const result = await client.query<UserRow>(
		`SELECT id, email, password_hash, external_auth_id, base_currency_code
		 FROM users
		 WHERE id = $1`,
		[id],
	)
	return result.rows[0] ?? null
}

export async function createUser(
	data: {
		email: string
		passwordHash: string
		baseCurrencyCode: string
	},
	pool?: Pool,
): Promise<UserRow> {
	const client = pool ?? getPool()
	const result = await client.query<UserRow>(
		`INSERT INTO users (email, password_hash, base_currency_code)
		 VALUES ($1, $2, $3)
		 RETURNING id, email, password_hash, external_auth_id, base_currency_code`,
		[data.email, data.passwordHash, data.baseCurrencyCode],
	)
	return result.rows[0]
}

export async function updatePassword(
	userId: string,
	passwordHash: string,
	pool?: Pool,
): Promise<void> {
	const client = pool ?? getPool()
	await client.query(
		`UPDATE users SET password_hash = $1, external_auth_id = NULL WHERE id = $2`,
		[passwordHash, userId],
	)
}

export async function updateEmail(
	userId: string,
	email: string,
	pool?: Pool,
): Promise<void> {
	const client = pool ?? getPool()
	await client.query(`UPDATE users SET email = $1 WHERE id = $2`, [
		email,
		userId,
	])
}

export async function migrateToPasswordAuth(
	userId: string,
	passwordHash: string,
	pool?: Pool,
): Promise<void> {
	const client = pool ?? getPool()
	await client.query(
		`UPDATE users SET password_hash = $1, external_auth_id = NULL WHERE id = $2`,
		[passwordHash, userId],
	)
}

export async function getFirstUserWithoutPassword(pool?: Pool): Promise<UserRow | null> {
	const client = pool ?? getPool()
	const result = await client.query<UserRow>(
		`SELECT id, email, password_hash, external_auth_id, base_currency_code
		 FROM users
		 WHERE password_hash IS NULL AND external_auth_id IS NOT NULL
		 LIMIT 1`,
	)
	return result.rows[0] ?? null
}

export async function getUserCount(pool?: Pool): Promise<number> {
	const client = pool ?? getPool()
	const result = await client.query<{ count: string }>(
		`SELECT COUNT(*)::text AS count FROM users`,
	)
	return Number(result.rows[0]?.count ?? 0)
}

export async function getFirstUser(pool?: Pool): Promise<UserRow | null> {
	const client = pool ?? getPool()
	const result = await client.query<UserRow>(
		`SELECT id, email, password_hash, external_auth_id, base_currency_code
		 FROM users
		 ORDER BY id
		 LIMIT 1`,
	)
	return result.rows[0] ?? null
}
