/**
 * POST /api/sms-webhook -- receives raw SMS messages from an iOS Shortcut
 * (or any other source), parses them, resolves the target account + category,
 * and creates a finance-tracker operation.
 *
 * Auth: X-Api-Key header validated by apiKeyAuth middleware.
 *
 * Request body:
 *   { message: string, sender?: string, receivedAt?: string }
 *
 * Response:
 *   201 -- operation created  { smsImport, operation }
 *   200 -- duplicate detected { smsImport, duplicate: true }
 *   200 -- no parser matched  { smsImport, skipped: true }
 *   422 -- parse or mapping failure { smsImport, error: string }
 *   400 -- bad request
 *   401 -- invalid API key (handled by middleware)
 */
import crypto from 'crypto'
import { Router, type Request, type Response } from 'express'
import { apiKeyAuth } from '../middleware/api-key-auth.js'
import { findParser } from '../services/sms-parsers/index.js'
import * as smsImportsRepo from '../repositories/sms-imports.js'
import * as operationsRepo from '../repositories/operations.js'
import * as smsAccountMapper from '../services/sms-account-mapper.js'

const router = Router()

function getUserId(req: Request): string {
	const id = req.headers['x-user-id'] ?? req.query.userId
	if (typeof id === 'string') return id
	return '1'
}

function hashMessage(text: string): string {
	return crypto.createHash('sha256').update(text).digest('hex')
}

router.post('/', apiKeyAuth, async (req: Request, res: Response) => {
	const userId = getUserId(req)

	// #region agent log
	console.log(`[DBG-e78543] webhook handler entry`, JSON.stringify({ userId, bodyType: typeof req.body, bodyKeys: req.body ? Object.keys(req.body) : null, rawBody: JSON.stringify(req.body).slice(0, 500) }))
	// #endregion

	const { message, sender, receivedAt } = req.body as {
		message?: string
		sender?: string
		receivedAt?: string
	}

	if (!message || typeof message !== 'string') {
		// #region agent log
		console.log(`[DBG-e78543] webhook 400: message missing or not string`, JSON.stringify({ messageType: typeof message, messageValue: message }))
		// #endregion
		res.status(400).json({ error: 'message is required' })
		return
	}

	const messageHash = hashMessage(message)

	try {
		const existing = await smsImportsRepo.findByHash(userId, messageHash)
		if (existing) {
			// #region agent log
			console.log(`[DBG-e78543] webhook 200: duplicate`)
			// #endregion
			res.status(200).json({ smsImport: existing, duplicate: true })
			return
		}

		const senderStr = sender ?? ''
		const parser = findParser(senderStr, message)

		// #region agent log
		console.log(`[DBG-e78543] parser result`, JSON.stringify({ parserFound: !!parser, parserName: parser?.name ?? null, sender: senderStr, messagePreview: message.slice(0, 120) }))
		// #endregion

		if (!parser) {
			const smsImport = await smsImportsRepo.create({
				user_id: userId,
				raw_message: message,
				sender: senderStr || null,
				received_at: receivedAt ?? null,
				status: 'skipped',
				message_hash: messageHash,
			})
			// #region agent log
			console.log(`[DBG-e78543] webhook 200: skipped (no parser)`)
			// #endregion
			res.status(200).json({ smsImport, skipped: true })
			return
		}

		const parsed = parser.parse(message)

		// #region agent log
		console.log(`[DBG-e78543] parsed result`, JSON.stringify({ parsed }))
		// #endregion

		if (!parsed) {
			const smsImport = await smsImportsRepo.create({
				user_id: userId,
				raw_message: message,
				sender: senderStr || null,
				received_at: receivedAt ?? null,
				parser_used: parser.name,
				status: 'failed',
				error_message: 'Parser could not extract data from message',
				message_hash: messageHash,
			})
			res.status(422).json({
				smsImport,
				error: 'Parser could not extract data from message',
			})
			return
		}

		const mapping = await smsAccountMapper.resolve(userId, parsed)

		if (!mapping) {
			const smsImport = await smsImportsRepo.create({
				user_id: userId,
				raw_message: message,
				sender: senderStr || null,
				received_at: receivedAt ?? null,
				parser_used: parser.name,
				parsed_data: parsed as unknown as Record<string, unknown>,
				status: 'failed',
				error_message:
					'Could not resolve account (no accounts configured)',
				message_hash: messageHash,
			})
			res.status(422).json({
				smsImport,
				error: 'Could not resolve account',
			})
			return
		}

		const operationTime =
			parsed.transactionDate
			?? receivedAt
			?? new Date().toISOString()

		const notes = parsed.merchant
			? `SMS: ${parsed.merchant}`
			: 'SMS import'

		const operation = await operationsRepo.createOperation({
			user_id: userId,
			operation_type: parsed.operationType,
			operation_time: operationTime,
			account_id: mapping.accountId,
			category_id: mapping.categoryId,
			amount: parsed.amount,
			currency_code: mapping.currencyCode,
			notes,
		})

		const smsImport = await smsImportsRepo.create({
			user_id: userId,
			raw_message: message,
			sender: senderStr || null,
			received_at: receivedAt ?? null,
			parser_used: parser.name,
			parsed_data: parsed as unknown as Record<string, unknown>,
			operation_id: operation.id,
			status: 'processed',
			message_hash: messageHash,
		})

		// #region agent log
		console.log(`[DBG-e78543] webhook 201: operation created`, JSON.stringify({ operationId: operation.id }))
		// #endregion
		res.status(201).json({ smsImport, operation })
	} catch (err) {
		// #region agent log
		console.log(`[DBG-e78543] webhook CATCH error`, JSON.stringify({ error: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack?.split('\n').slice(0, 3).join(' | ') : null }))
		// #endregion
		console.error('sms-webhook', err)

		try {
			await smsImportsRepo.create({
				user_id: userId,
				raw_message: message,
				sender: sender ?? null,
				received_at: receivedAt ?? null,
				status: 'failed',
				error_message:
					err instanceof Error ? err.message : 'Unknown error',
				message_hash: messageHash,
			})
		} catch {
			// duplicate hash from a concurrent request -- safe to ignore
		}

		res.status(500).json({ error: 'SMS processing failed' })
	}
})

export default router
