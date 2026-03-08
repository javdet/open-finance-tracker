/**
 * REST routes for operations (read/write using operations repository).
 */
import { Router, type Request, type Response } from 'express'
import * as operationsRepo from '../repositories/operations.js'
import { ensureRatesForDate } from '../services/exchange-rate-cache.js'

const router = Router()

function getUserId(req: Request): string {
	const id = req.headers['x-user-id'] ?? req.query.userId
	if (typeof id === 'string') return id
	return '1'
}

router.get('/', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const fromTime = req.query.fromTime as string | undefined
		const toTime = req.query.toTime as string | undefined
		const accountId = req.query.accountId as string | undefined
		const categoryId = req.query.categoryId as string | undefined
		const operationType = req.query.operationType as string | undefined
		const limit = req.query.limit !== undefined ? Number(req.query.limit) : undefined
		const offset = req.query.offset !== undefined ? Number(req.query.offset) : undefined
		const { rows, total } = await operationsRepo.listOperations(
			{
				userId,
				fromTime,
				toTime,
				accountId,
				categoryId,
				operationType,
				limit,
				offset,
			},
		)
		res.json({ rows, total })
	} catch (err) {
		console.error('listOperations', err)
		res.status(500).json({ error: 'Failed to list operations' })
	}
})

router.get('/category-usage', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const operationType = req.query.operationType as 'payment' | 'income'
		if (operationType !== 'payment' && operationType !== 'income') {
			res.status(400).json({ error: 'operationType must be payment or income' })
			return
		}
		const rows = await operationsRepo.getCategoryUsageCounts(userId, operationType)
		res.json({ categoryIds: rows.map((r) => r.category_id) })
	} catch (err) {
		console.error('getCategoryUsageCounts', err)
		res.status(500).json({ error: 'Failed to get category usage' })
	}
})

router.get('/category-totals', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const fromTime = req.query.fromTime as string
		const toTime = req.query.toTime as string
		const operationType = req.query.operationType as 'payment' | 'income'
		const baseCurrencyCode = (req.query.baseCurrencyCode as string) ?? 'USD'
		if (!fromTime || !toTime) {
			res.status(400).json({ error: 'fromTime and toTime are required' })
			return
		}
		if (operationType !== 'payment' && operationType !== 'income') {
			res.status(400).json({ error: 'operationType must be payment or income' })
			return
		}
		const dateStr = fromTime.slice(0, 10)
		await ensureRatesForDate(baseCurrencyCode, dateStr)
		const rows = await operationsRepo.getCategoryTotalsInBase(
			userId,
			fromTime,
			toTime,
			operationType,
			baseCurrencyCode,
		)
		res.json({
			rows: rows.map((r) => ({
				categoryId: r.category_id,
				actualAmount: Number(r.actual_amount),
			})),
		})
	} catch (err) {
		console.error('getCategoryTotalsInBase', err)
		res.status(500).json({ error: 'Failed to get category totals' })
	}
})

router.get('/:id', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const op = await operationsRepo.getOperationById(req.params.id, userId)
		if (!op) {
			res.status(404).json({ error: 'Operation not found' })
			return
		}
		res.json(op)
	} catch (err) {
		console.error('getOperation', err)
		res.status(500).json({ error: 'Failed to get operation' })
	}
})

router.post('/', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const body = req.body as {
			operationType: string
			operationTime: string
			accountId: string
			transferAccountId?: string | null
			categoryId?: string | null
			amount: number
			currencyCode: string
			amountInBase?: number | null
			transferAmount?: number | null
			notes?: string | null
		}
		const op = await operationsRepo.createOperation({
			user_id: userId,
			operation_type: body.operationType,
			operation_time: body.operationTime,
			account_id: body.accountId,
			transfer_account_id: body.transferAccountId ?? null,
			category_id: body.categoryId ?? null,
			amount: body.amount,
			currency_code: body.currencyCode,
			amount_in_base: body.amountInBase ?? null,
			transfer_amount: body.transferAmount ?? null,
			notes: body.notes ?? null,
		})
		res.status(201).json(op)
	} catch (err) {
		console.error('createOperation', err)
		res.status(500).json({ error: 'Failed to create operation' })
	}
})

router.patch('/:id', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const body = req.body as {
			operationTime?: string
			accountId?: string
			transferAccountId?: string | null
			categoryId?: string | null
			amount?: number
			currencyCode?: string
			amountInBase?: number | null
			transferAmount?: number | null
			notes?: string | null
		}
		const op = await operationsRepo.updateOperation(
			req.params.id,
			userId,
			{
				operation_time: body.operationTime,
				account_id: body.accountId,
				transfer_account_id: body.transferAccountId,
				category_id: body.categoryId,
				amount: body.amount,
				currency_code: body.currencyCode,
				amount_in_base: body.amountInBase,
				transfer_amount: body.transferAmount,
				notes: body.notes,
			},
		)
		if (!op) {
			res.status(404).json({ error: 'Operation not found' })
			return
		}
		res.json(op)
	} catch (err) {
		console.error('updateOperation', err)
		res.status(500).json({ error: 'Failed to update operation' })
	}
})

router.delete('/:id', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const deleted = await operationsRepo.deleteOperation(
			req.params.id,
			userId,
		)
		if (!deleted) {
			res.status(404).json({ error: 'Operation not found' })
			return
		}
		res.status(204).send()
	} catch (err) {
		console.error('deleteOperation', err)
		res.status(500).json({ error: 'Failed to delete operation' })
	}
})

export default router
