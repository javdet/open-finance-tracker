/**
 * Auth routes: login, logout, me, change credentials, password reset.
 */
import crypto from 'crypto'
import { Router, type Request, type Response } from 'express'
import argon2 from 'argon2'
import * as usersRepo from '../repositories/users.js'
import * as resetTokensRepo from '../repositories/password-reset-tokens.js'
import { sessionAuth } from '../middleware/session-auth.js'
import { sendPasswordResetEmail } from '../services/email.js'
import { getPool } from '../db/client.js'

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000
const RESET_RATE_LIMIT_MINUTES = 5
const MIN_PASSWORD_LENGTH = 8

const router = Router()

router.post('/login', async (req: Request, res: Response): Promise<void> => {
	const { login, password } = req.body as { login?: string; password?: string }

	if (!login || typeof login !== 'string' || !password || typeof password !== 'string') {
		res.status(400).json({ error: 'login and password are required' })
		return
	}

	const user = await usersRepo.findByEmail(login.trim())
	if (!user || !user.password_hash) {
		res.status(401).json({ error: 'Invalid login or password' })
		return
	}

	const valid = await argon2.verify(user.password_hash, password)
	if (!valid) {
		res.status(401).json({ error: 'Invalid login or password' })
		return
	}

	req.session!.userId = String(user.id)
	res.json({ userId: String(user.id) })
})

router.post('/logout', (req: Request, res: Response): void => {
	req.session?.destroy(() => {
		res.status(204).send()
	})
})

router.get('/me', (req: Request, res: Response): void => {
	const userId = req.session?.userId
	if (!userId) {
		res.status(401).json({ error: 'Not authenticated' })
		return
	}
	usersRepo.findById(userId).then((user) => {
		if (!user) {
			res.status(401).json({ error: 'Not authenticated' })
			return
		}
		res.json({ userId: String(user.id), login: user.email })
	}).catch((err) => {
		console.error('auth/me', err)
		res.status(500).json({ error: 'Authentication failed' })
	})
})

router.patch(
	'/credentials',
	sessionAuth,
	async (req: Request, res: Response): Promise<void> => {
		const userId = req.session!.userId!
		const {
			currentPassword,
			newLogin,
			newPassword,
		} = req.body as {
			currentPassword?: string
			newLogin?: string
			newPassword?: string
		}

		if (!currentPassword || typeof currentPassword !== 'string') {
			res.status(400).json({ error: 'currentPassword is required' })
			return
		}

		const user = await usersRepo.findById(userId)
		if (!user || !user.password_hash) {
			res.status(401).json({ error: 'Not authenticated' })
			return
		}

		const valid = await argon2.verify(user.password_hash, currentPassword)
		if (!valid) {
			res.status(400).json({ error: 'Current password is incorrect' })
			return
		}

		if (newLogin !== undefined) {
			if (typeof newLogin !== 'string' || !newLogin.trim()) {
				res.status(400).json({ error: 'newLogin must be a non-empty string' })
				return
			}
			const existing = await usersRepo.findByEmail(newLogin.trim())
			if (existing && String(existing.id) !== userId) {
				res.status(409).json({ error: 'Login already in use' })
				return
			}
			await usersRepo.updateEmail(userId, newLogin.trim())
		}

		if (newPassword !== undefined) {
			if (typeof newPassword !== 'string' || newPassword.length < 1) {
				res.status(400).json({ error: 'newPassword must be a non-empty string' })
				return
			}
			const hash = await argon2.hash(newPassword, { type: argon2.argon2id })
			await usersRepo.updatePassword(userId, hash)
		}

		res.status(204).send()
	},
)

function hashToken(token: string): string {
	return crypto.createHash('sha256').update(token).digest('hex')
}

router.post(
	'/forgot-password',
	async (req: Request, res: Response): Promise<void> => {
		const { email } = req.body as { email?: string }

		// Always return 200 to prevent email enumeration
		const ok = () => res.json({
			message: 'If an account with that email exists, a reset link has been sent.',
		})

		if (!email || typeof email !== 'string' || !email.trim()) {
			ok()
			return
		}

		try {
			const user = await usersRepo.findByEmail(email.trim())
			if (!user) {
				ok()
				return
			}

			const userId = String(user.id)

			const hasRecent = await resetTokensRepo.hasRecentToken(
				userId,
				RESET_RATE_LIMIT_MINUTES,
			)
			if (hasRecent) {
				ok()
				return
			}

			const rawToken = crypto.randomBytes(32).toString('hex')
			const tokenHash = hashToken(rawToken)
			const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS)

			await resetTokensRepo.createToken(userId, tokenHash, expiresAt)
			await sendPasswordResetEmail(user.email, rawToken)
		} catch (err) {
			console.error('forgot-password error:', err)
		}

		ok()
	},
)

router.post(
	'/reset-password',
	async (req: Request, res: Response): Promise<void> => {
		const { token, newPassword } = req.body as {
			token?: string
			newPassword?: string
		}

		if (!token || typeof token !== 'string') {
			res.status(400).json({ error: 'Reset token is required' })
			return
		}

		if (
			!newPassword ||
			typeof newPassword !== 'string' ||
			newPassword.length < MIN_PASSWORD_LENGTH
		) {
			res.status(400).json({
				error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
			})
			return
		}

		const tokenHash = hashToken(token)
		const resetToken = await resetTokensRepo.findValidToken(tokenHash)

		if (!resetToken) {
			res.status(400).json({
				error: 'Invalid or expired reset link. Please request a new one.',
			})
			return
		}

		const passwordHash = await argon2.hash(newPassword, {
			type: argon2.argon2id,
		})
		await usersRepo.updatePassword(resetToken.user_id, passwordHash)
		await resetTokensRepo.markUsed(resetToken.id)
		await resetTokensRepo.invalidateUserTokens(resetToken.user_id)

		// Destroy all sessions for this user
		const pool = getPool()
		await pool.query(
			`DELETE FROM session WHERE sess::jsonb->>'userId' = $1`,
			[resetToken.user_id],
		)

		res.json({ message: 'Password has been reset successfully.' })
	},
)

export default router
