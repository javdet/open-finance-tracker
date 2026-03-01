/**
 * Data access for sms_account_mappings table.
 * Maps card/account last-4 digits to finance-tracker accounts and default
 * expense categories so the SMS webhook can auto-resolve where to book
 * incoming transactions.
 */
import type { Pool } from 'pg'
import { getPool } from '../db/client.js'

export interface SmsAccountMappingRow {
	id: string
	user_id: string
	card_last4: string | null
	account_last4: string | null
	account_id: string
	default_category_id: string | null
}

export interface CreateMappingRow {
	user_id: string
	card_last4?: string | null
	account_last4?: string | null
	account_id: string
	default_category_id?: string | null
}

export interface UpdateMappingRow {
	card_last4?: string | null
	account_last4?: string | null
	account_id?: string
	default_category_id?: string | null
}

function rowToMapping(row: SmsAccountMappingRow) {
	return {
		id: String(row.id),
		userId: String(row.user_id),
		cardLast4: row.card_last4,
		accountLast4: row.account_last4,
		accountId: String(row.account_id),
		defaultCategoryId: row.default_category_id
			? String(row.default_category_id)
			: null,
	}
}

export type SmsAccountMapping = ReturnType<typeof rowToMapping>

const SELECT_COLS = `id, user_id, card_last4, account_last4,
	account_id, default_category_id`

export async function listByUser(
	userId: string,
	pool?: Pool,
): Promise<SmsAccountMapping[]> {
	const client = pool ?? getPool()
	const result = await client.query<SmsAccountMappingRow>(
		`SELECT ${SELECT_COLS}
		 FROM sms_account_mappings
		 WHERE user_id = $1
		 ORDER BY id`,
		[userId],
	)
	return result.rows.map(rowToMapping)
}

export async function getById(
	id: string,
	userId: string,
	pool?: Pool,
): Promise<SmsAccountMapping | null> {
	const client = pool ?? getPool()
	const result = await client.query<SmsAccountMappingRow>(
		`SELECT ${SELECT_COLS}
		 FROM sms_account_mappings
		 WHERE id = $1 AND user_id = $2`,
		[id, userId],
	)
	const row = result.rows[0]
	return row ? rowToMapping(row) : null
}

/**
 * Find the mapping that matches a card or account last-4 identifier.
 * Tries card_last4 first, then account_last4.
 */
export async function findByIdentifier(
	userId: string,
	cardLast4: string | null | undefined,
	accountLast4: string | null | undefined,
	pool?: Pool,
): Promise<SmsAccountMapping | null> {
	const client = pool ?? getPool()

	if (cardLast4) {
		const result = await client.query<SmsAccountMappingRow>(
			`SELECT ${SELECT_COLS}
			 FROM sms_account_mappings
			 WHERE user_id = $1 AND card_last4 = $2
			 LIMIT 1`,
			[userId, cardLast4],
		)
		if (result.rows[0]) return rowToMapping(result.rows[0])
	}

	if (accountLast4) {
		const result = await client.query<SmsAccountMappingRow>(
			`SELECT ${SELECT_COLS}
			 FROM sms_account_mappings
			 WHERE user_id = $1 AND account_last4 = $2
			 LIMIT 1`,
			[userId, accountLast4],
		)
		if (result.rows[0]) return rowToMapping(result.rows[0])
	}

	return null
}

export async function createMapping(
	data: CreateMappingRow,
	pool?: Pool,
): Promise<SmsAccountMapping> {
	const client = pool ?? getPool()
	const result = await client.query<SmsAccountMappingRow>(
		`INSERT INTO sms_account_mappings
		 (user_id, card_last4, account_last4, account_id, default_category_id)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING ${SELECT_COLS}`,
		[
			data.user_id,
			data.card_last4 ?? null,
			data.account_last4 ?? null,
			data.account_id,
			data.default_category_id ?? null,
		],
	)
	return rowToMapping(result.rows[0])
}

export async function updateMapping(
	id: string,
	userId: string,
	data: UpdateMappingRow,
	pool?: Pool,
): Promise<SmsAccountMapping | null> {
	const client = pool ?? getPool()
	const result = await client.query<SmsAccountMappingRow>(
		`UPDATE sms_account_mappings SET
		 card_last4 = COALESCE($3, card_last4),
		 account_last4 = COALESCE($4, account_last4),
		 account_id = COALESCE($5, account_id),
		 default_category_id = $6
		 WHERE id = $1 AND user_id = $2
		 RETURNING ${SELECT_COLS}`,
		[
			id,
			userId,
			data.card_last4,
			data.account_last4,
			data.account_id,
			data.default_category_id,
		],
	)
	const row = result.rows[0]
	return row ? rowToMapping(row) : null
}

export async function deleteMapping(
	id: string,
	userId: string,
	pool?: Pool,
): Promise<boolean> {
	const client = pool ?? getPool()
	const result = await client.query(
		`DELETE FROM sms_account_mappings
		 WHERE id = $1 AND user_id = $2`,
		[id, userId],
	)
	return (result.rowCount ?? 0) > 0
}
