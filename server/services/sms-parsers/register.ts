/**
 * Parser registration entry-point.
 *
 * Import this module **once** at app startup (e.g. from `server/index.ts`)
 * so the webhook can discover parsers via `findParser()`.
 *
 * ### How to register a new parser
 *
 * 1. Import the parser instance from its module.
 * 2. Call `registerParser()` with it.
 *
 * **Order matters:** parsers are checked in registration order. The first
 * parser whose `canParse()` returns `true` wins, so register more specific
 * parsers (e.g. Bangkok Bank by sender) before generic ones (e.g. Thai
 * transfer by message prefix).
 *
 * See `server/services/sms-parsers/index.ts` for the full guide on creating
 * new parsers.
 */

import { registerParser } from './index.js'
import { bangkokBankParser } from './bangkok-bank.js'
import { thaiTransferSmsParser } from './thai-transfer-sms.js'

registerParser(bangkokBankParser)
registerParser(thaiTransferSmsParser)
