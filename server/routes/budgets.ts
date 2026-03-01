/**
 * REST routes for budgets and budget items (read/write using repositories).
 */
import { Router, type Request, type Response } from 'express'
import * as budgetsRepo from '../repositories/budgets.js'
import * as budgetItemsRepo from '../repositories/budget-items.js'
import * as scheduledTxRepo from '../repositories/scheduled-transactions.js'

const router = Router()

function getUserId(req: Request): string {
	const id = req.headers['x-user-id'] ?? req.query.userId
	if (typeof id === 'string') return id
	return '1'
}

router.get('/', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const budgets = await budgetsRepo.listBudgetsByUser(userId)
		res.json(budgets)
	} catch (err) {
		console.error('listBudgets', err)
		res.status(500).json({ error: 'Failed to list budgets' })
	}
})

router.get('/:id', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const budget = await budgetsRepo.getBudgetById(req.params.id, userId)
		if (!budget) {
			res.status(404).json({ error: 'Budget not found' })
			return
		}
		res.json(budget)
	} catch (err) {
		console.error('getBudget', err)
		res.status(500).json({ error: 'Failed to get budget' })
	}
})

router.post('/monthly', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const body = req.body as {
			month: number
			year: number
			baseCurrencyCode?: string
		}
		const budget = await budgetsRepo.findOrCreateMonthlyBudget(
			userId,
			body.month,
			body.year,
			body.baseCurrencyCode ?? 'USD',
		)
		res.json(budget)
	} catch (err) {
		console.error('findOrCreateMonthlyBudget', err)
		res.status(500).json({ error: 'Failed to find or create monthly budget' })
	}
})

router.get('/:id/items', async (req: Request, res: Response) => {
	try {
		const budget = await budgetsRepo.getBudgetById(
			req.params.id,
			getUserId(req),
		)
		if (!budget) {
			res.status(404).json({ error: 'Budget not found' })
			return
		}
		const items =
			await budgetItemsRepo.listBudgetItemsByBudgetId(req.params.id)
		res.json(items)
	} catch (err) {
		console.error('listBudgetItems', err)
		res.status(500).json({ error: 'Failed to list budget items' })
	}
})

router.post('/', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const body = req.body as {
			name: string
			periodType: string
			startDate: string
			endDate: string
			baseCurrencyCode: string
			notes?: string | null
			items?: { categoryId: string; plannedAmount: number; accountId?: string | null }[]
		}
		const budget = await budgetsRepo.createBudget({
			user_id: userId,
			name: body.name,
			period_type: body.periodType,
			start_date: body.startDate,
			end_date: body.endDate,
			base_currency_code: body.baseCurrencyCode,
			notes: body.notes ?? null,
		})
		if (body.items?.length) {
			for (const item of body.items) {
				await budgetItemsRepo.createBudgetItem({
					budget_id: budget.id,
					category_id: item.categoryId,
					planned_amount: item.plannedAmount,
					account_id: item.accountId ?? null,
				})
			}
		}
		const withItems = await budgetsRepo.getBudgetById(budget.id, userId)
		res.status(201).json(withItems ?? budget)
	} catch (err) {
		console.error('createBudget', err)
		res.status(500).json({ error: 'Failed to create budget' })
	}
})

router.patch('/:id', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const body = req.body as {
			name?: string
			periodType?: string
			startDate?: string
			endDate?: string
			baseCurrencyCode?: string
			notes?: string | null
		}
		const budget = await budgetsRepo.updateBudget(
			req.params.id,
			userId,
			{
				name: body.name,
				period_type: body.periodType,
				start_date: body.startDate,
				end_date: body.endDate,
				base_currency_code: body.baseCurrencyCode,
				notes: body.notes,
			},
		)
		if (!budget) {
			res.status(404).json({ error: 'Budget not found' })
			return
		}
		res.json(budget)
	} catch (err) {
		console.error('updateBudget', err)
		res.status(500).json({ error: 'Failed to update budget' })
	}
})

router.delete('/:id', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const deleted = await budgetsRepo.deleteBudget(req.params.id, userId)
		if (!deleted) {
			res.status(404).json({ error: 'Budget not found' })
			return
		}
		res.status(204).send()
	} catch (err) {
		console.error('deleteBudget', err)
		res.status(500).json({ error: 'Failed to delete budget' })
	}
})

// Budget items endpoints
router.post('/:id/items', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const budget = await budgetsRepo.getBudgetById(req.params.id, userId)
		if (!budget) {
			res.status(404).json({ error: 'Budget not found' })
			return
		}
		const body = req.body as {
			categoryId: string
			plannedAmount: number
			accountId?: string | null
		}
		const item = await budgetItemsRepo.createBudgetItem({
			budget_id: budget.id,
			category_id: body.categoryId,
			planned_amount: body.plannedAmount,
			account_id: body.accountId ?? null,
		})
		res.status(201).json(item)
	} catch (err) {
		console.error('createBudgetItem', err)
		res.status(500).json({ error: 'Failed to create budget item' })
	}
})

router.patch('/:id/items/:itemId', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const budget = await budgetsRepo.getBudgetById(req.params.id, userId)
		if (!budget) {
			res.status(404).json({ error: 'Budget not found' })
			return
		}
		const body = req.body as {
			plannedAmount?: number
			accountId?: string | null
		}

		if (body.plannedAmount !== undefined) {
			const existingItem = await budgetItemsRepo.getBudgetItemById(
				req.params.itemId,
				req.params.id,
			)
			if (!existingItem) {
				res.status(404).json({ error: 'Budget item not found' })
				return
			}
			const categoryTotals =
				await scheduledTxRepo.getCategoryTotals(userId)
			const scheduled = categoryTotals.find(
				(t) => t.categoryId === existingItem.categoryId,
			)
			if (scheduled && body.plannedAmount < scheduled.monthlyTotal) {
				res.status(400).json({
					error: `Planned amount cannot be less than scheduled `
						+ `transactions total (${scheduled.monthlyTotal})`,
					scheduledMinimum: scheduled.monthlyTotal,
				})
				return
			}
		}

		const item = await budgetItemsRepo.updateBudgetItem(
			req.params.itemId,
			req.params.id,
			{
				planned_amount: body.plannedAmount,
				account_id: body.accountId,
			},
		)
		if (!item) {
			res.status(404).json({ error: 'Budget item not found' })
			return
		}
		res.json(item)
	} catch (err) {
		console.error('updateBudgetItem', err)
		res.status(500).json({ error: 'Failed to update budget item' })
	}
})

router.delete('/:id/items/:itemId', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const budget = await budgetsRepo.getBudgetById(req.params.id, userId)
		if (!budget) {
			res.status(404).json({ error: 'Budget not found' })
			return
		}
		const deleted = await budgetItemsRepo.deleteBudgetItem(
			req.params.itemId,
			req.params.id,
		)
		if (!deleted) {
			res.status(404).json({ error: 'Budget item not found' })
			return
		}
		res.status(204).send()
	} catch (err) {
		console.error('deleteBudgetItem', err)
		res.status(500).json({ error: 'Failed to delete budget item' })
	}
})

export default router
