/**
 * Express middleware that requires a valid session.
 * Sets req.headers['x-user-id'] for compatibility with getUserId() in routes.
 */
import type { Request, Response, NextFunction } from 'express'

export function sessionAuth(
	req: Request,
	res: Response,
	next: NextFunction,
): void {
	const userId = req.session?.userId
	if (!userId) {
		res.status(401).json({ error: 'Authentication required' })
		return
	}
	req.headers['x-user-id'] = userId
	next()
}
