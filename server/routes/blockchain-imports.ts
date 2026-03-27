/**
 * REST routes for blockchain import history — read-only listing of
 * on-chain transfers detected by the background poller.
 */
import { Router, type Request, type Response } from 'express'
import * as blockchainImportsRepo from '../repositories/blockchain-imports.js'

const router = Router()

function getUserId(req: Request): string {
	const id = req.headers['x-user-id'] ?? req.query.userId
	if (typeof id === 'string') return id
	return '1'
}

router.get('/', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const limit = req.query.limit !== undefined
			? Number(req.query.limit)
			: undefined
		const offset = req.query.offset !== undefined
			? Number(req.query.offset)
			: undefined
		const result = await blockchainImportsRepo.listByUser(
			userId,
			{ limit, offset },
		)
		res.json(result)
	} catch (err) {
		console.error('listBlockchainImports', err)
		res.status(500).json({ error: 'Failed to list blockchain imports' })
	}
})

export default router
