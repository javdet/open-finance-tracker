/**
 * SMS Parser Framework
 *
 * Central module that defines the {@link SmsParser} interface every bank/SMS
 * parser must implement and maintains a runtime registry so the webhook
 * handler ({@link ../routes/sms-webhook.ts}) can find the right parser for
 * each incoming message.
 *
 * ## Architecture overview
 *
 * ```
 * iOS Shortcut / HTTP client
 *       │  POST /api/sms-webhook  { message, sender? }
 *       ▼
 * sms-webhook.ts
 *       │  findParser(sender, message)
 *       ▼
 * index.ts  ◄── this file (registry)
 *       │  parser.parse(message) → ParsedSms
 *       ▼
 * sms-account-mapper.ts
 *       │  resolve(userId, parsed) → { accountId, categoryId }
 *       ▼
 * operationsRepo.createOperation()
 * ```
 *
 * ## Adding a new bank parser
 *
 * 1. **Create the parser file** in `server/services/sms-parsers/`.
 *    Name it after the bank or SMS format in kebab-case, e.g.
 *    `kasikorn-bank.ts`.
 *
 * 2. **Implement the {@link SmsParser} interface:**
 *
 *    ```typescript
 *    import type { ParsedSms, SmsParser } from './index.js'
 *
 *    export const kasikornBankParser: SmsParser = {
 *      name: 'kasikorn-bank',
 *
 *      canParse(sender: string, message: string): boolean {
 *        // Return true when the sender or message text indicates this
 *        // parser should handle the message. Keep it cheap — this is
 *        // called for every incoming SMS until a match is found.
 *        return /^KBANK/i.test(sender) || /^KBank:/i.test(message)
 *      },
 *
 *      parse(message: string): ParsedSms | null {
 *        // Extract structured data with regex. Return null if the
 *        // message matched canParse() but has an unexpected format.
 *        const m = message.match(SOME_REGEX)
 *        if (!m) return null
 *        return {
 *          operationType: 'payment',   // or 'income'
 *          amount: parseFloat(m[1]),
 *          currencyCode: 'THB',
 *          cardLast4: m[2],            // optional
 *          accountLast4: m[3],         // optional
 *          merchant: m[4],             // optional
 *          balance: parseFloat(m[5]),  // optional
 *          transactionDate: '2026-01-15', // optional ISO date
 *        }
 *      },
 *    }
 *    ```
 *
 * 3. **Register it** in `server/services/sms-parsers/register.ts`:
 *
 *    ```typescript
 *    import { kasikornBankParser } from './kasikorn-bank.js'
 *    registerParser(kasikornBankParser)
 *    ```
 *
 *    Parser order matters — the first parser whose `canParse()` returns
 *    `true` wins. Place more specific parsers before generic ones.
 *
 * 4. **Write tests** alongside the parser, e.g. `kasikorn-bank.test.ts`.
 *    Follow the pattern in `bangkok-bank.test.ts`:
 *    - `canParse` — positive and negative cases
 *    - `parse` — happy paths for each message variant
 *    - Edge cases — commas in amounts, missing optional fields, etc.
 *
 * 5. **Configure account mappings** so the resolver knows which
 *    finance-tracker account corresponds to the card/account number in
 *    the SMS. Use the Settings UI or call the API directly:
 *
 *    ```
 *    POST /api/sms-account-mappings
 *    {
 *      "account_id": "<finance-tracker account UUID>",
 *      "card_last4": "1234",          // for card-spending parsers
 *      "account_last4": "5678",       // for account-level parsers
 *      "default_category_id": "..."   // optional — overrides fallback
 *    }
 *    ```
 *
 *    Without a mapping the system falls back to the user's first active
 *    account and an "Inbox" (expense) or "Other income" (income)
 *    category.
 *
 * ## Testing parsers locally
 *
 * Run the parser unit tests inside the app container:
 *
 * ```bash
 * docker compose exec app npx vitest run server/services/sms-parsers/
 * ```
 *
 * To send a test SMS through the full pipeline:
 *
 * ```bash
 * curl -X POST http://localhost:3000/api/sms-webhook \
 *   -H 'Content-Type: application/json' \
 *   -H 'X-Api-Key: <your-api-key>' \
 *   -d '{ "sender": "BANK", "message": "..." }'
 * ```
 *
 * The response will be one of:
 * - **201** — operation created successfully
 * - **200 `{ skipped: true }`** — no parser matched (non-financial SMS)
 * - **200 `{ duplicate: true }`** — message already processed
 * - **422** — parser matched but could not extract data, or account
 *   resolution failed
 *
 * All attempts are logged in the `sms_imports` table for auditing.
 *
 * @module sms-parsers
 */

/** Structured data extracted from a raw SMS message by a parser. */
export interface ParsedSms {
	/** Whether this message represents money going out or coming in. */
	operationType: 'payment' | 'income'
	/** Transaction amount (always positive). */
	amount: number
	/** ISO 4217 currency code, e.g. "THB", "USD". */
	currencyCode: string
	/** Merchant name or payment method description, if available. */
	merchant?: string
	/** Last 4 digits of the card referenced in the SMS. */
	cardLast4?: string
	/** Last 4 digits of the bank account referenced in the SMS. */
	accountLast4?: string
	/** Account balance after the transaction, if provided. */
	balance?: number
	/** ISO-8601 date/datetime of the transaction, if extractable. */
	transactionDate?: string
}

/**
 * Interface that every bank-specific SMS parser must implement.
 *
 * Parsers are stateless — they receive a raw message string and return
 * structured data without any side effects.
 */
export interface SmsParser {
	/** Human-readable name stored in `sms_imports.parser_used`. */
	name: string

	/**
	 * Quick check whether this parser can handle the given message.
	 * Called for every incoming SMS until a match is found, so keep it
	 * lightweight (string prefix checks or simple regex tests).
	 */
	canParse(sender: string, message: string): boolean

	/**
	 * Extract structured data from the raw message text.
	 * @returns parsed data, or `null` when the message format is
	 *          unexpected (logged as a parse failure).
	 */
	parse(message: string): ParsedSms | null
}

const parsers: SmsParser[] = []

/** Register a parser so the webhook can discover it at runtime. */
export function registerParser(parser: SmsParser): void {
	parsers.push(parser)
}

/**
 * Walk through registered parsers and return the first one whose
 * `canParse()` returns `true`, or `undefined` if none match.
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
