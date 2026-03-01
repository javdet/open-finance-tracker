/**
 * REST routes for scheduled transactions (recurring payments/income).
 */
import { Router, type Request, type Response } from 'express'
import * as scheduledTxRepo from '../repositories/scheduled-transactions.js'

const router = Router()

function getUserId(req: Request): string {
	const id = req.headers['x-user-id'] ?? req.query.userId
	if (typeof id === 'string') return id
	return '1'
}

router.get('/category-totals', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const totals = await scheduledTxRepo.getCategoryTotals(userId)
		res.json({ rows: totals })
	} catch (err) {
		console.error('getScheduledCategoryTotals', err)
		res.status(500).json({ error: 'Failed to get category totals' })
	}
})

router.get('/', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const rows = await scheduledTxRepo.listByUser(userId)
		res.json({ rows })
	} catch (err) {
		console.error('listScheduledTransactions', err)
		res.status(500).json({ error: 'Failed to list scheduled transactions' })
	}
})

router.get('/:id', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const item = await scheduledTxRepo.getById(req.params.id, userId)
		if (!item) {
			res.status(404).json({ error: 'Scheduled transaction not found' })
			return
		}
		res.json(item)
	} catch (err) {
		console.error('getScheduledTransaction', err)
		res.status(500).json({ error: 'Failed to get scheduled transaction' })
	}
})

router.post('/', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const body = req.body as {
			name: string
			operationType: string
			categoryId?: string | null
			accountId: string
			transferAccountId?: string | null
			amount: number
			currencyCode: string
			recurrencePeriod: scheduledTxRepo.RecurrencePeriod
			startDate: string
			notifyPayment?: boolean
			isActive?: boolean
			notes?: string | null
		}
		const item = await scheduledTxRepo.create({
			user_id: userId,
			name: body.name,
			operation_type: body.operationType,
			category_id: body.categoryId ?? null,
			account_id: body.accountId,
			transfer_account_id: body.transferAccountId ?? null,
			amount: body.amount,
			currency_code: body.currencyCode,
			recurrence_period: body.recurrencePeriod,
			start_date: body.startDate,
			notify_payment: body.notifyPayment,
			is_active: body.isActive,
			notes: body.notes ?? null,
		})
		res.status(201).json(item)
	} catch (err) {
		console.error('createScheduledTransaction', err)
		res.status(500).json({ error: 'Failed to create scheduled transaction' })
	}
})

router.patch('/:id', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const body = req.body as {
			name?: string
			categoryId?: string | null
			accountId?: string
			transferAccountId?: string | null
			amount?: number
			currencyCode?: string
			recurrencePeriod?: scheduledTxRepo.RecurrencePeriod
			startDate?: string
			notifyPayment?: boolean
			isActive?: boolean
			notes?: string | null
		}
		const item = await scheduledTxRepo.update(
			req.params.id,
			userId,
			{
				name: body.name,
				category_id: body.categoryId,
				account_id: body.accountId,
				transfer_account_id: body.transferAccountId,
				amount: body.amount,
				currency_code: body.currencyCode,
				recurrence_period: body.recurrencePeriod,
				start_date: body.startDate,
				notify_payment: body.notifyPayment,
				is_active: body.isActive,
				notes: body.notes,
			},
		)
		if (!item) {
			res.status(404).json({ error: 'Scheduled transaction not found' })
			return
		}
		res.json(item)
	} catch (err) {
		console.error('updateScheduledTransaction', err)
		res.status(500).json({ error: 'Failed to update scheduled transaction' })
	}
})

router.delete('/:id', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const deleted = await scheduledTxRepo.deleteById(
			req.params.id,
			userId,
		)
		if (!deleted) {
			res.status(404).json({ error: 'Scheduled transaction not found' })
			return
		}
		res.status(204).send()
	} catch (err) {
		console.error('deleteScheduledTransaction', err)
		res.status(500).json({ error: 'Failed to delete scheduled transaction' })
	}
})

export default router
