/**
 * Registers all available SMS parsers. Import this module once at app startup
 * (e.g. from server/index.ts) so the webhook can discover parsers via
 * findParser().
 *
 * To add a new bank parser, import it here and call registerParser().
 */

import { registerParser } from './index.js'
import { bangkokBankParser } from './bangkok-bank.js'

registerParser(bangkokBankParser)
