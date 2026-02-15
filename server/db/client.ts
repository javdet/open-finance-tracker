/**
 * Postgres connection pool for the finance-tracker data access layer.
 * Uses DATABASE_URL env var (e.g. postgres://user:pass@localhost:5432/finance_tracker).
 */
import pg from 'pg'

const { Pool } = pg

function getDatabaseUrl(): string {
	const url = process.env.DATABASE_URL
	if (!url) {
		throw new Error(
			'DATABASE_URL is required (e.g. postgres://user:pass@localhost:5432/finance_tracker)',
		)
	}
	return url
}

let pool: pg.Pool | null = null

/**
 * Returns the shared Postgres pool. Creates it on first call.
 */
export function getPool(): pg.Pool {
	if (!pool) {
		pool = new Pool({
			connectionString: getDatabaseUrl(),
			max: 10,
			idleTimeoutMillis: 30000,
		})
	}
	return pool
}

/**
 * Closes the pool (e.g. on shutdown). Idempotent.
 */
export async function closePool(): Promise<void> {
	if (pool) {
		await pool.end()
		pool = null
	}
}
