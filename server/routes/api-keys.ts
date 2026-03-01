/**
 * REST routes for API key management (create, list, revoke).
 * Mounted at /api/api-keys.
 */
import { Router, type Request, type Response } from 'express'
import * as apiKeysRepo from '../repositories/api-keys.js'

const router = Router()

function getUserId(req: Request): string {
	const id = req.headers['x-user-id'] ?? req.query.userId
	if (typeof id === 'string') return id
	return '1'
}

router.post('/', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const { label } = req.body as { label: string }

		if (!label || !label.trim()) {
			res.status(400).json({ error: 'Label is required' })
			return
		}

		const key = await apiKeysRepo.createApiKey(userId, label.trim())
		res.status(201).json(key)
	} catch (err) {
		console.error('createApiKey', err)
		res.status(500).json({ error: 'Failed to create API key' })
	}
})

router.get('/', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const keys = await apiKeysRepo.listApiKeysByUser(userId)
		res.json(keys)
	} catch (err) {
		console.error('listApiKeys', err)
		res.status(500).json({ error: 'Failed to list API keys' })
	}
})

router.delete('/:id', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const revoked = await apiKeysRepo.revokeApiKey(req.params.id, userId)

		if (!revoked) {
			res.status(404).json({ error: 'API key not found' })
			return
		}

		res.status(204).send()
	} catch (err) {
		console.error('revokeApiKey', err)
		res.status(500).json({ error: 'Failed to revoke API key' })
	}
})

export default router
