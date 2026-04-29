/**
 * REST routes for wallet watches — CRUD for blockchain wallet monitoring
 * and on-demand polling.
 */
import { Router, type Request, type Response } from 'express'
import * as walletWatchesRepo from '../repositories/wallet-watches.js'
import { pollWatch } from '../services/blockchain/poller.js'
import type { Chain } from '../services/blockchain/index.js'

const router = Router()

const VALID_CHAINS: Chain[] = ['ethereum', 'tron', 'solana']

function getUserId(req: Request): string {
	const id = req.headers['x-user-id'] ?? req.query.userId
	if (typeof id === 'string') return id
	return '1'
}

const ADDRESS_PATTERNS: Record<Chain, RegExp> = {
	ethereum: /^0x[0-9a-fA-F]{40}$/,
	tron: /^T[1-9A-HJ-NP-Za-km-z]{33}$/,
	solana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
}

function validateWalletAddress(chain: Chain, address: string): string | null {
	const pattern = ADDRESS_PATTERNS[chain]
	if (!pattern) {
		return `Unsupported chain: ${chain}`
	}
	if (!pattern.test(address)) {
		return `Invalid ${chain} wallet address`
	}
	return null
}

router.get('/', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const accountId = typeof req.query.accountId === 'string'
			? req.query.accountId
			: undefined

		if (accountId) {
			const watch = await walletWatchesRepo.findByAccountId(
				accountId,
				userId,
			)
			res.json({ rows: watch ? [watch] : [], total: watch ? 1 : 0 })
			return
		}

		const limit = req.query.limit !== undefined
			? Number(req.query.limit)
			: undefined
		const offset = req.query.offset !== undefined
			? Number(req.query.offset)
			: undefined
		const result = await walletWatchesRepo.listByUser(
			userId,
			{ limit, offset },
		)
		res.json(result)
	} catch (err) {
		console.error('listWalletWatches', err)
		res.status(500).json({ error: 'Failed to list wallet watches' })
	}
})

router.get('/:id', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const watch = await walletWatchesRepo.findById(req.params.id, userId)
		if (!watch) {
			res.status(404).json({ error: 'Wallet watch not found' })
			return
		}
		res.json(watch)
	} catch (err) {
		console.error('getWalletWatch', err)
		res.status(500).json({ error: 'Failed to get wallet watch' })
	}
})

router.post('/', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const body = req.body as {
			chain: string
			walletAddress: string
			accountId: string
			defaultCategoryId?: string | null
			isActive?: boolean
			pollIntervalMs?: number
		}

		if (!body.chain || !VALID_CHAINS.includes(body.chain as Chain)) {
			res.status(400).json({
				error: `chain must be one of: ${VALID_CHAINS.join(', ')}`,
			})
			return
		}
		if (!body.walletAddress || !body.walletAddress.trim()) {
			res.status(400).json({ error: 'walletAddress is required' })
			return
		}
		if (!body.accountId) {
			res.status(400).json({ error: 'accountId is required' })
			return
		}

		const chain = body.chain as Chain
		const addressError = validateWalletAddress(chain, body.walletAddress.trim())
		if (addressError) {
			res.status(400).json({ error: addressError })
			return
		}

		const watch = await walletWatchesRepo.create({
			user_id: userId,
			chain,
			wallet_address: body.walletAddress.trim(),
			account_id: body.accountId,
			default_category_id: body.defaultCategoryId ?? null,
			is_active: body.isActive,
			poll_interval_ms: body.pollIntervalMs,
		})
		res.status(201).json(watch)
	} catch (err) {
		console.error('createWalletWatch', err)
		const message = err instanceof Error ? err.message : 'Failed to create wallet watch'
		const isDuplicate = message.includes('wallet_watches_user_chain_address_unique')
		res.status(isDuplicate ? 409 : 500).json({
			error: isDuplicate
				? 'A watch for this chain and address already exists'
				: message,
		})
	}
})

router.patch('/:id', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const body = req.body as {
			accountId?: string
			defaultCategoryId?: string | null
			isActive?: boolean
			pollIntervalMs?: number
		}

		const data: walletWatchesRepo.UpdateWalletWatchRow = {}
		if ('accountId' in body) data.account_id = body.accountId
		if ('defaultCategoryId' in body) data.default_category_id = body.defaultCategoryId
		if ('isActive' in body) data.is_active = body.isActive
		if ('pollIntervalMs' in body) data.poll_interval_ms = body.pollIntervalMs

		const watch = await walletWatchesRepo.update(
			req.params.id,
			userId,
			data,
		)
		if (!watch) {
			res.status(404).json({ error: 'Wallet watch not found' })
			return
		}
		res.json(watch)
	} catch (err) {
		console.error('updateWalletWatch', err)
		res.status(500).json({ error: 'Failed to update wallet watch' })
	}
})

router.delete('/:id', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const deleted = await walletWatchesRepo.remove(req.params.id, userId)
		if (!deleted) {
			res.status(404).json({ error: 'Wallet watch not found' })
			return
		}
		res.status(204).send()
	} catch (err) {
		console.error('deleteWalletWatch', err)
		res.status(500).json({ error: 'Failed to delete wallet watch' })
	}
})

router.post('/:id/poll-now', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const watch = await walletWatchesRepo.findById(req.params.id, userId)
		if (!watch) {
			res.status(404).json({ error: 'Wallet watch not found' })
			return
		}
		if (!watch.isActive) {
			res.status(400).json({ error: 'Wallet watch is paused' })
			return
		}

		const created = await pollWatch(watch)
		res.json({ created, message: `Poll complete. ${created} new operation(s) created.` })
	} catch (err) {
		console.error('pollNowWalletWatch', err)
		const message = err instanceof Error ? err.message : 'Failed to poll wallet watch'
		res.status(502).json({ error: message })
	}
})

export default router
