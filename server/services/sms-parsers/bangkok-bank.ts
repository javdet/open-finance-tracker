/**
 * Bangkok Bank (BBL) SMS parser.
 *
 * Handles common BBL notification formats:
 *
 * Card spending (debit):
 *   "BBL: card *1234 used THB 1,500.00 at CENTRAL DEPT STORE on 23/02/26 14:30"
 *   "BBL *1234 THB1,500.00 CENTRAL DEPT STORE 23/02/26 14:30"
 *
 * Account debit:
 *   "BBL: Acct *5678 debit THB 25,000.00 on 23/02/26 Bal THB 150,000.00"
 *
 * Account credit:
 *   "BBL: Acct *5678 credit THB 50,000.00 on 23/02/26 Bal THB 200,000.00"
 *
 * The regexes are intentionally lenient with whitespace and optional keywords
 * so they survive minor carrier reformatting. Patterns will be refined as real
 * samples are collected.
 */

import type { ParsedSms, SmsParser } from './index.js'

const SENDER_PATTERNS = [
	/bangkok\s*bank/i,
	/\bBBL\b/i,
	/\bBBKB\b/i,
]

const CURRENCY = '(THB|USD|EUR|GBP|JPY|CNY|SGD|AUD|HKD)'
const AMOUNT = '([\\d,]+\\.\\d{2})'

/**
 * Card spending pattern.
 * Captures: [1] card last 4, [2] currency, [3] amount,
 *           [4] merchant (optional), [5] date (optional)
 *
 * Examples:
 *   "card *1234 used THB 1,500.00 at CENTRAL on 23/02/26"
 *   "*1234 THB1,500.00 CENTRAL 23/02/26 14:30"
 */
const CARD_USED_RE = new RegExp(
	'(?:card\\s+)?'
	+ '\\*(\\d{4})\\s+'
	+ '(?:(?:used|spent|charged)\\s+)?'
	+ `${CURRENCY}\\s*${AMOUNT}`
	+ '(?:\\s+(?:at\\s+)?(.+?))?'
	+ '(?:\\s+(?:on\\s+)?(\\d{1,2}[/.-]\\d{1,2}[/.-]\\d{2,4})(?:\\s+\\d{1,2}:\\d{2})?)?'
	+ '\\s*$',
	'i',
)

/**
 * Account debit/credit pattern.
 * Captures: [1] acct last 4, [2] direction (debit|withdraw|credit|deposit|transfer),
 *           [3] currency, [4] amount, [5] date (optional),
 *           [6] balance currency (optional), [7] balance (optional)
 */
const ACCT_RE = new RegExp(
	'(?:Acct|A/?C|Account)\\s*'
	+ '\\*(\\d{4})\\s+'
	+ '(debit|withdraw|credit|deposit|transfer(?:\\s+in)?|transfer(?:\\s+out)?)\\s+'
	+ `${CURRENCY}\\s*${AMOUNT}`
	+ '(?:\\s+(?:on\\s+)?(\\d{1,2}[/.-]\\d{1,2}[/.-]\\d{2,4})(?:\\s+\\d{1,2}:\\d{2})?)?'
	+ `(?:\\s+Bal(?:ance)?\\s*${CURRENCY}\\s*${AMOUNT})?`
	+ '\\s*$',
	'i',
)

function parseAmount(raw: string): number {
	return parseFloat(raw.replace(/,/g, ''))
}

/**
 * Parse DD/MM/YY or DD/MM/YYYY into an ISO-8601 date string.
 * Returns undefined when the format is unrecognised.
 */
function parseDate(raw: string): string | undefined {
	const parts = raw.split(/[/.-]/)
	if (parts.length !== 3) return undefined

	const day = parseInt(parts[0], 10)
	const month = parseInt(parts[1], 10)
	let year = parseInt(parts[2], 10)

	if (year < 100) {
		year += year < 70 ? 2000 : 1900
	}
	// Buddhist calendar years (e.g. 2569 instead of 2026)
	if (year > 2400) {
		year -= 543
	}

	const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
	return iso
}

const DEBIT_DIRECTIONS = new Set([
	'debit',
	'withdraw',
	'transfer out',
])

function isDebit(direction: string): boolean {
	return DEBIT_DIRECTIONS.has(direction.trim().toLowerCase())
}

function tryParseCardUsed(body: string): ParsedSms | null {
	const m = body.match(CARD_USED_RE)
	if (!m) return null

	return {
		operationType: 'payment',
		cardLast4: m[1],
		currencyCode: m[2].toUpperCase(),
		amount: parseAmount(m[3]),
		merchant: m[4]?.trim() || undefined,
		transactionDate: m[5] ? parseDate(m[5]) : undefined,
	}
}

function tryParseAccount(body: string): ParsedSms | null {
	const m = body.match(ACCT_RE)
	if (!m) return null

	const direction = m[2]
	const debit = isDebit(direction)

	return {
		operationType: debit ? 'payment' : 'income',
		accountLast4: m[1],
		currencyCode: m[3].toUpperCase(),
		amount: parseAmount(m[4]),
		transactionDate: m[5] ? parseDate(m[5]) : undefined,
		balance: m[7] ? parseAmount(m[7]) : undefined,
	}
}

/** Strip the common "BBL:" / "BANGKOKBANK:" prefix and leading whitespace. */
function stripPrefix(message: string): string {
	return message
		.replace(/^(?:BBL|BANGKOKBANK|Bangkok\s*Bank)\s*:?\s*/i, '')
		.trim()
}

export const bangkokBankParser: SmsParser = {
	name: 'bangkok-bank',

	canParse(sender: string, message: string): boolean {
		if (SENDER_PATTERNS.some((re) => re.test(sender))) {
			return true
		}
		return /^(?:BBL|BANGKOKBANK|Bangkok\s*Bank)\s*:/i.test(message)
	},

	parse(message: string): ParsedSms | null {
		const body = stripPrefix(message)
		return tryParseCardUsed(body) ?? tryParseAccount(body)
	},
}
