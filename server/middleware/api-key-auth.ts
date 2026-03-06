/**
 * Express middleware that authenticates requests via the X-Api-Key header.
 * On success it sets req.headers['x-user-id'] so downstream handlers
 * can use the same getUserId() helper as session-based routes.
 */
import type { Request, Response, NextFunction } from 'express'
import * as apiKeysRepo from '../repositories/api-keys.js'

export async function apiKeyAuth(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	const rawKey = req.headers['x-api-key']
	if (typeof rawKey !== 'string' || !rawKey) {
		res.status(401).json({ error: 'Missing X-Api-Key header' })
		return
	}

	try {
		const key = await apiKeysRepo.findByRawKey(rawKey)
		if (!key) {
			res.status(401).json({ error: 'Invalid or revoked API key' })
			return
		}

		req.headers['x-user-id'] = key.userId
		next()
	} catch (err) {
		console.error('apiKeyAuth', err)
		res.status(500).json({ error: 'Authentication failed' })
	}
}
