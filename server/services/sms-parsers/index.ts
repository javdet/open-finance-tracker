/**
 * SMS parser framework: defines the interface every bank-specific parser must
 * implement and exposes a registry that the webhook handler queries to find the
 * right parser for an incoming message.
 */

export interface ParsedSms {
	operationType: 'payment' | 'income'
	amount: number
	currencyCode: string
	merchant?: string
	cardLast4?: string
	accountLast4?: string
	balance?: number
	transactionDate?: string
}

export interface SmsParser {
	/** Human-readable name shown in sms_imports.parser_used */
	name: string
	/** Return true when this parser can handle the given sender/message combo. */
	canParse(sender: string, message: string): boolean
	/** Extract structured data from the raw message text. null = parse failure. */
	parse(message: string): ParsedSms | null
}

const parsers: SmsParser[] = []

/** Register a parser so the webhook can discover it at runtime. */
export function registerParser(parser: SmsParser): void {
	parsers.push(parser)
}

/**
 * Walk through registered parsers and return the first one that claims to
 * handle this sender + message pair, or undefined if none match.
 */
export function findParser(
	sender: string,
	message: string,
): SmsParser | undefined {
	return parsers.find((p) => p.canParse(sender, message))
}

/** Return a shallow copy of all registered parsers (useful for diagnostics). */
export function listParsers(): readonly SmsParser[] {
	return [...parsers]
}

/**
 * Remove all parsers from the registry (only used in tests to avoid
 * cross-test pollution).
 */
export function clearParsers(): void {
	parsers.length = 0
}
