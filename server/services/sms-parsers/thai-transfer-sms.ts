/**
 * Thai bank transfer/withdrawal SMS parser.
 *
 * Handles generic Thai bank notification formats for transfers and withdrawals:
 *
 * Income (transfer to account):
 *   "Transfer to your account X1234 of Bt 5,000.00 via MOBILE; the available balance is Bt 45,000.00@12:34"
 *
 * Expense (withdrawal/transfer/payment from account):
 *   "Withdrawal/transfer/payment from your account X1234 of Bt 3,000.00 via DBCARD; the available balance is Bt 42,000.00.@14:30"
 *
 * The balance portion and trailing time stamp are optional.
 * Currency is always THB (derived from "Bt" prefix in the message).
 * The "via" method (e.g. DBCARD, MOBILE, AUTO system) is mapped to merchant.
 */

import type { ParsedSms, SmsParser } from './index.js'

const INCOME_PREFIX_RE = /^(?:Deposit\/transfer|Transfer)\s+to\s+your\s+account/i

const EXPENSE_PREFIX_RE =
	/^(?:Withdrawal\/transfer\/payment|Withdrawal|transfer|payment)\s+from\s+your\s+account/i

const AMOUNT = '([\\d,]+\\.\\d{2})'

/**
 * Income pattern.
 * Captures: [1] account last 4, [2] amount, [3] method,
 *           [4] balance (optional), [5] time HH:MM (optional)
 */
const INCOME_RE = new RegExp(
	'(?:Deposit/transfer|Transfer)\\s+to\\s+your\\s+account\\s+X(\\d{4})\\s+'
	+ 'of\\s+Bt\\s+' + AMOUNT + '\\s+'
	+ 'via\\s+([^;]+?)'
	+ '\\s*(?:;\\s*the\\s+available\\s+balance\\s+is\\s+Bt\\s+' + AMOUNT
	+ '\\.?(?:@(\\d{1,2}:\\d{2}))?)?'
	+ '\\s*$',
	'i',
)

/**
 * Expense pattern.
 * Captures: [1] account last 4, [2] amount, [3] method,
 *           [4] balance (optional), [5] time HH:MM (optional)
 */
const EXPENSE_RE = new RegExp(
	'(?:Withdrawal/transfer/payment|Withdrawal|transfer|payment)\\s+'
	+ 'from\\s+your\\s+account\\s+X(\\d{4})\\s+'
	+ 'of\\s+Bt\\s+' + AMOUNT + '\\s+'
	+ 'via\\s+([^;]+?)'
	+ '\\s*(?:;\\s*the\\s+available\\s+balance\\s+is\\s+Bt\\s+' + AMOUNT
	+ '\\.?(?:@(\\d{1,2}:\\d{2}))?)?'
	+ '\\s*$',
	'i',
)

function parseAmount(raw: string): number {
	return parseFloat(raw.replace(/,/g, ''))
}

function tryParseIncome(message: string): ParsedSms | null {
	const m = message.match(INCOME_RE)
	if (!m) return null

	return {
		operationType: 'income',
		accountLast4: m[1],
		amount: parseAmount(m[2]),
		currencyCode: 'THB',
		merchant: m[3]?.trim() || undefined,
		balance: m[4] ? parseAmount(m[4]) : undefined,
	}
}

function tryParseExpense(message: string): ParsedSms | null {
	const m = message.match(EXPENSE_RE)
	if (!m) return null

	return {
		operationType: 'payment',
		accountLast4: m[1],
		amount: parseAmount(m[2]),
		currencyCode: 'THB',
		merchant: m[3]?.trim() || undefined,
		balance: m[4] ? parseAmount(m[4]) : undefined,
	}
}

export const thaiTransferSmsParser: SmsParser = {
	name: 'thai-transfer-sms',

	canParse(_sender: string, message: string): boolean {
		return INCOME_PREFIX_RE.test(message) || EXPENSE_PREFIX_RE.test(message)
	},

	parse(message: string): ParsedSms | null {
		return tryParseIncome(message) ?? tryParseExpense(message)
	},
}
