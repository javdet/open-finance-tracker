/**
 * REST routes for SMS account mappings CRUD.
 * Mounted at /api/sms-account-mappings.
 */
import { Router, type Request, type Response } from 'express'
import * as mappingsRepo from '../repositories/sms-account-mappings.js'

const router = Router()

function getUserId(req: Request): string {
	const id = req.headers['x-user-id'] ?? req.query.userId
	if (typeof id === 'string') return id
	return '1'
}

const LAST4_RE = /^\d{4}$/

function validateBody(body: {
	cardLast4?: string | null
	accountLast4?: string | null
	accountId?: string
}) {
	if (!body.cardLast4 && !body.accountLast4) {
		return 'At least one of cardLast4 or accountLast4 is required'
	}
	if (body.cardLast4 && !LAST4_RE.test(body.cardLast4)) {
		return 'cardLast4 must be exactly 4 digits'
	}
	if (body.accountLast4 && !LAST4_RE.test(body.accountLast4)) {
		return 'accountLast4 must be exactly 4 digits'
	}
	return null
}

router.get('/', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const mappings = await mappingsRepo.listByUser(userId)
		res.json(mappings)
	} catch (err) {
		console.error('listSmsMappings', err)
		res.status(500).json({ error: 'Failed to list SMS account mappings' })
	}
})

router.get('/:id', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const mapping = await mappingsRepo.getById(req.params.id, userId)
		if (!mapping) {
			res.status(404).json({ error: 'SMS account mapping not found' })
			return
		}
		res.json(mapping)
	} catch (err) {
		console.error('getSmsMappingById', err)
		res.status(500).json({ error: 'Failed to get SMS account mapping' })
	}
})

router.post('/', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const body = req.body as {
			cardLast4?: string | null
			accountLast4?: string | null
			accountId: string
			defaultCategoryId?: string | null
		}

		if (!body.accountId) {
			res.status(400).json({ error: 'accountId is required' })
			return
		}

		const validationError = validateBody(body)
		if (validationError) {
			res.status(400).json({ error: validationError })
			return
		}

		const mapping = await mappingsRepo.createMapping({
			user_id: userId,
			card_last4: body.cardLast4 ?? null,
			account_last4: body.accountLast4 ?? null,
			account_id: body.accountId,
			default_category_id: body.defaultCategoryId ?? null,
		})
		res.status(201).json(mapping)
	} catch (err: unknown) {
		console.error('createSmsMapping', err)
		const pgErr = err as { code?: string }
		if (pgErr.code === '23505') {
			res.status(409).json({
				error: 'A mapping with this card/account identifier already exists',
			})
			return
		}
		res.status(500).json({ error: 'Failed to create SMS account mapping' })
	}
})

router.patch('/:id', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const body = req.body as {
			cardLast4?: string | null
			accountLast4?: string | null
			accountId?: string
			defaultCategoryId?: string | null
		}

		if (body.cardLast4 && !LAST4_RE.test(body.cardLast4)) {
			res.status(400).json({ error: 'cardLast4 must be exactly 4 digits' })
			return
		}
		if (body.accountLast4 && !LAST4_RE.test(body.accountLast4)) {
			res
				.status(400)
				.json({ error: 'accountLast4 must be exactly 4 digits' })
			return
		}

		const mapping = await mappingsRepo.updateMapping(
			req.params.id,
			userId,
			{
				card_last4: body.cardLast4,
				account_last4: body.accountLast4,
				account_id: body.accountId,
				default_category_id: body.defaultCategoryId,
			},
		)
		if (!mapping) {
			res.status(404).json({ error: 'SMS account mapping not found' })
			return
		}
		res.json(mapping)
	} catch (err: unknown) {
		console.error('updateSmsMapping', err)
		const pgErr = err as { code?: string }
		if (pgErr.code === '23505') {
			res.status(409).json({
				error: 'A mapping with this card/account identifier already exists',
			})
			return
		}
		res.status(500).json({ error: 'Failed to update SMS account mapping' })
	}
})

router.delete('/:id', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const deleted = await mappingsRepo.deleteMapping(req.params.id, userId)
		if (!deleted) {
			res.status(404).json({ error: 'SMS account mapping not found' })
			return
		}
		res.status(204).send()
	} catch (err) {
		console.error('deleteSmsMapping', err)
		res.status(500).json({ error: 'Failed to delete SMS account mapping' })
	}
})

export default router
