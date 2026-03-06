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
	// #region agent log
	console.log(`[DBG-e78543] apiKeyAuth entry`, JSON.stringify({ method: req.method, url: req.originalUrl, hasApiKey: !!req.headers['x-api-key'], contentType: req.headers['content-type'], ip: req.ip }))
	// #endregion
	const rawKey = req.headers['x-api-key']
	if (typeof rawKey !== 'string' || !rawKey) {
		// #region agent log
		console.log(`[DBG-e78543] apiKeyAuth REJECTED: missing key`)
		// #endregion
		res.status(401).json({ error: 'Missing X-Api-Key header' })
		return
	}

	try {
		const key = await apiKeysRepo.findByRawKey(rawKey)
		if (!key) {
			// #region agent log
			console.log(`[DBG-e78543] apiKeyAuth REJECTED: invalid/revoked key`)
			// #endregion
			res.status(401).json({ error: 'Invalid or revoked API key' })
			return
		}

		// #region agent log
		console.log(`[DBG-e78543] apiKeyAuth OK userId=${key.userId}`)
		// #endregion
		req.headers['x-user-id'] = key.userId
		next()
	} catch (err) {
		// #region agent log
		console.log(`[DBG-e78543] apiKeyAuth ERROR`, err instanceof Error ? err.message : err)
		// #endregion
		console.error('apiKeyAuth', err)
		res.status(500).json({ error: 'Authentication failed' })
	}
}
