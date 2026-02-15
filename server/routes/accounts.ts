/**
 * REST routes for accounts (read/write using accounts repository).
 */
import { Router, type Request, type Response } from 'express'
import * as accountsRepo from '../repositories/accounts.js'

const router = Router()

function getUserId(req: Request): string {
	const id = req.headers['x-user-id'] ?? req.query.userId
	if (typeof id === 'string') return id
	return '1'
}

router.get('/', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const accounts = await accountsRepo.listAccountsByUser(userId)
		res.json(accounts)
	} catch (err) {
		console.error('listAccounts', err)
		res.status(500).json({ error: 'Failed to list accounts' })
	}
})

router.get('/:id', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const account = await accountsRepo.getAccountById(req.params.id, userId)
		if (!account) {
			res.status(404).json({ error: 'Account not found' })
			return
		}
		res.json(account)
	} catch (err) {
		console.error('getAccount', err)
		res.status(500).json({ error: 'Failed to get account' })
	}
})

const CRYPTO_CURRENCIES = ['USDT', 'USDC']

function validateCryptoCurrency(
	accountType: string,
	currencyCode: string,
): void {
	if (accountType === 'crypto' && !CRYPTO_CURRENCIES.includes(currencyCode)) {
		throw new Error(
			'Crypto accounts must use USDT or USDC as currency',
		)
	}
}

router.post('/', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const body = req.body as {
			name: string
			accountType: string
			description?: string | null
			currencyCode: string
			initialBalance?: number
			isActive?: boolean
		}
		validateCryptoCurrency(body.accountType, body.currencyCode)
		const account = await accountsRepo.createAccount({
			user_id: userId,
			name: body.name,
			account_type: body.accountType,
			description: body.description ?? null,
			currency_code: body.currencyCode,
			initial_balance: body.initialBalance,
			is_active: body.isActive,
		})
		res.status(201).json(account)
	} catch (err) {
		console.error('createAccount', err)
		const message = err instanceof Error ? err.message : 'Failed to create account'
		const status = message.includes('USDT or USDC') ? 400 : 500
		res.status(status).json({ error: message })
	}
})

router.patch('/:id', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const body = req.body as {
			name?: string
			accountType?: string
			description?: string | null
			currencyCode?: string
			initialBalance?: number
			isActive?: boolean
		}
		const accountType = body.accountType
		const currencyCode = body.currencyCode
		if (accountType !== undefined && currencyCode !== undefined) {
			validateCryptoCurrency(accountType, currencyCode)
		} else if (accountType !== undefined || currencyCode !== undefined) {
			const existing = await accountsRepo.getAccountById(req.params.id, userId)
			if (existing) {
				validateCryptoCurrency(
					accountType ?? existing.accountType,
					currencyCode ?? existing.currencyCode,
				)
			}
		}
		const account = await accountsRepo.updateAccount(
			req.params.id,
			userId,
			{
				name: body.name,
				account_type: body.accountType,
				description: body.description,
				currency_code: body.currencyCode,
				initial_balance: body.initialBalance,
				is_active: body.isActive,
			},
		)
		if (!account) {
			res.status(404).json({ error: 'Account not found' })
			return
		}
		res.json(account)
	} catch (err) {
		console.error('updateAccount', err)
		const message = err instanceof Error ? err.message : 'Failed to update account'
		const status = message.includes('USDT or USDC') ? 400 : 500
		res.status(status).json({ error: message })
	}
})

router.delete('/:id', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const deleted = await accountsRepo.deleteAccount(req.params.id, userId)
		if (!deleted) {
			res.status(404).json({ error: 'Account not found' })
			return
		}
		res.status(204).send()
	} catch (err) {
		console.error('deleteAccount', err)
		res.status(500).json({ error: 'Failed to delete account' })
	}
})

export default router
