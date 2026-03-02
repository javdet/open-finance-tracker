/**
 * Resolves parsed SMS data to finance-tracker account and category IDs
 * using the DB-backed sms_account_mappings configuration.
 *
 * Resolution order:
 *   1. Look up by card_last4 (from card-spending messages).
 *   2. Look up by account_last4 (from account debit/credit messages).
 *   3. Fall back to the user's first active account.
 *
 * Category resolution:
 *   1. Use the mapping's default_category_id when present.
 *   2. Fall back to the first active category matching the operation direction.
 */
import type { Pool } from 'pg'
import type { ParsedSms } from './sms-parsers/index.js'
import { getPool } from '../db/client.js'
import * as mappingsRepo from '../repositories/sms-account-mappings.js'

export interface ResolvedMapping {
	accountId: string
	categoryId: string | null
	currencyCode: string
}

/**
 * Look up the first active account for a user (ordered by name) as a
 * last-resort fallback when no SMS mapping matches.
 */
async function getFallbackAccount(
	userId: string,
	client: Pool,
): Promise<{ id: string; currencyCode: string } | null> {
	const result = await client.query<{
		id: string
		currency_code: string
	}>(
		`SELECT id::text, currency_code
		 FROM accounts
		 WHERE user_id = $1 AND is_active = TRUE
		 ORDER BY name
		 LIMIT 1`,
		[userId],
	)
	const row = result.rows[0]
	return row ? { id: row.id, currencyCode: row.currency_code } : null
}

/**
 * Look up the currency_code for a specific account.
 */
async function getAccountCurrency(
	accountId: string,
	client: Pool,
): Promise<string | null> {
	const result = await client.query<{ currency_code: string }>(
		`SELECT currency_code FROM accounts WHERE id = $1`,
		[accountId],
	)
	return result.rows[0]?.currency_code ?? null
}

const PREFERRED_CATEGORY: Record<'expense' | 'income', string> = {
	expense: 'Inbox',
	income: 'Other income',
}

/**
 * Find the first active category whose direction matches the parsed
 * operation type (payment → expense, income → income).
 *
 * Prefers a well-known category name ("Inbox" for expenses, "Other income"
 * for income) when it exists; otherwise falls back to first alphabetical.
 */
async function getFallbackCategory(
	userId: string,
	direction: 'expense' | 'income',
	client: Pool,
): Promise<string | null> {
	const preferredName = PREFERRED_CATEGORY[direction]
	const result = await client.query<{ id: string }>(
		`SELECT id::text
		 FROM categories
		 WHERE user_id = $1
		   AND direction = $2
		   AND is_active = TRUE
		 ORDER BY (name = $3) DESC, name
		 LIMIT 1`,
		[userId, direction, preferredName],
	)
	return result.rows[0]?.id ?? null
}

/**
 * Resolve a parsed SMS message to a finance-tracker account and category.
 *
 * @returns the resolved mapping, or null when no account could be determined
 *          (e.g. the user has no accounts at all).
 */
export async function resolve(
	userId: string,
	parsed: ParsedSms,
	pool?: Pool,
): Promise<ResolvedMapping | null> {
	const client = pool ?? getPool()

	const mapping = await mappingsRepo.findByIdentifier(
		userId,
		parsed.cardLast4,
		parsed.accountLast4,
		client,
	)

	let accountId: string
	let currencyCode: string

	if (mapping) {
		accountId = mapping.accountId
		const acctCurrency = await getAccountCurrency(accountId, client)
		currencyCode = acctCurrency ?? parsed.currencyCode
	} else {
		const fallback = await getFallbackAccount(userId, client)
		if (!fallback) return null
		accountId = fallback.id
		currencyCode = fallback.currencyCode
	}

	const direction = parsed.operationType === 'payment' ? 'expense' : 'income'

	let categoryId = mapping?.defaultCategoryId ?? null
	if (!categoryId) {
		categoryId = await getFallbackCategory(userId, direction, client)
	}

	return { accountId, categoryId, currencyCode }
}
