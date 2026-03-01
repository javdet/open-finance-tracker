/**
 * REST routes for SMS import history (read-only).
 * Mounted at /api/sms-imports.
 */
import { Router, type Request, type Response } from 'express'
import * as smsImportsRepo from '../repositories/sms-imports.js'

const router = Router()

function getUserId(req: Request): string {
	const id = req.headers['x-user-id'] ?? req.query.userId
	if (typeof id === 'string') return id
	return '1'
}

router.get('/', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const limit = Math.min(
			Math.max(parseInt(String(req.query.limit ?? '50'), 10) || 50, 1),
			200,
		)
		const offset = Math.max(
			parseInt(String(req.query.offset ?? '0'), 10) || 0,
			0,
		)

		const result = await smsImportsRepo.listByUser(
			userId,
			{ limit, offset },
		)
		res.json(result)
	} catch (err) {
		console.error('listSmsImports', err)
		res.status(500).json({ error: 'Failed to list SMS imports' })
	}
})

export default router
