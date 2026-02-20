/**
 * REST routes for budget templates and template items.
 */
import { Router, type Request, type Response } from 'express'
import * as budgetTemplatesRepo from '../repositories/budget-templates.js'
import * as budgetTemplateItemsRepo from '../repositories/budget-template-items.js'
import * as budgetsRepo from '../repositories/budgets.js'
import * as budgetItemsRepo from '../repositories/budget-items.js'

const router = Router()

function getUserId(req: Request): string {
	const id = req.headers['x-user-id'] ?? req.query.userId
	if (typeof id === 'string') return id
	return '1'
}

router.get('/', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const templates = await budgetTemplatesRepo.listBudgetTemplatesByUser(userId)
		res.json(templates)
	} catch (err) {
		console.error('listBudgetTemplates', err)
		res.status(500).json({ error: 'Failed to list budget templates' })
	}
})

router.post('/', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const body = req.body as {
			name: string
			baseCurrencyCode: string
			items?: { categoryId: string; plannedAmount: number; accountId?: string | null }[]
		}
		const template = await budgetTemplatesRepo.createBudgetTemplate({
			user_id: userId,
			name: body.name,
			base_currency_code: body.baseCurrencyCode ?? 'USD',
		})
		if (body.items?.length) {
			for (const item of body.items) {
				await budgetTemplateItemsRepo.createBudgetTemplateItem({
					template_id: template.id,
					category_id: item.categoryId,
					planned_amount: item.plannedAmount,
					account_id: item.accountId ?? null,
				})
			}
		}
		const withItems = await budgetTemplateItemsRepo.listBudgetTemplateItemsByTemplateId(template.id)
		res.status(201).json({ ...template, items: withItems })
	} catch (err) {
		console.error('createBudgetTemplate', err)
		res.status(500).json({ error: 'Failed to create budget template' })
	}
})

router.get('/:id', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const template = await budgetTemplatesRepo.getBudgetTemplateById(
			req.params.id,
			userId,
		)
		if (!template) {
			res.status(404).json({ error: 'Budget template not found' })
			return
		}
		res.json(template)
	} catch (err) {
		console.error('getBudgetTemplate', err)
		res.status(500).json({ error: 'Failed to get budget template' })
	}
})

router.patch('/:id', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const body = req.body as { name?: string; baseCurrencyCode?: string }
		const template = await budgetTemplatesRepo.updateBudgetTemplate(
			req.params.id,
			userId,
			{
				name: body.name,
				base_currency_code: body.baseCurrencyCode,
			},
		)
		if (!template) {
			res.status(404).json({ error: 'Budget template not found' })
			return
		}
		res.json(template)
	} catch (err) {
		console.error('updateBudgetTemplate', err)
		res.status(500).json({ error: 'Failed to update budget template' })
	}
})

router.delete('/:id', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const deleted = await budgetTemplatesRepo.deleteBudgetTemplate(
			req.params.id,
			userId,
		)
		if (!deleted) {
			res.status(404).json({ error: 'Budget template not found' })
			return
		}
		res.status(204).send()
	} catch (err) {
		console.error('deleteBudgetTemplate', err)
		res.status(500).json({ error: 'Failed to delete budget template' })
	}
})

router.get('/:id/items', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const template = await budgetTemplatesRepo.getBudgetTemplateById(
			req.params.id,
			userId,
		)
		if (!template) {
			res.status(404).json({ error: 'Budget template not found' })
			return
		}
		const items =
			await budgetTemplateItemsRepo.listBudgetTemplateItemsByTemplateId(
				req.params.id,
			)
		res.json(items)
	} catch (err) {
		console.error('listBudgetTemplateItems', err)
		res.status(500).json({ error: 'Failed to list budget template items' })
	}
})

router.post('/:id/items', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const template = await budgetTemplatesRepo.getBudgetTemplateById(
			req.params.id,
			userId,
		)
		if (!template) {
			res.status(404).json({ error: 'Budget template not found' })
			return
		}
		const body = req.body as {
			categoryId: string
			plannedAmount: number
			accountId?: string | null
		}
		const item = await budgetTemplateItemsRepo.createBudgetTemplateItem({
			template_id: req.params.id,
			category_id: body.categoryId,
			planned_amount: body.plannedAmount,
			account_id: body.accountId ?? null,
		})
		res.status(201).json(item)
	} catch (err) {
		console.error('createBudgetTemplateItem', err)
		res.status(500).json({ error: 'Failed to create budget template item' })
	}
})

router.patch('/:id/items/:itemId', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const template = await budgetTemplatesRepo.getBudgetTemplateById(
			req.params.id,
			userId,
		)
		if (!template) {
			res.status(404).json({ error: 'Budget template not found' })
			return
		}
		const body = req.body as {
			plannedAmount?: number
			accountId?: string | null
		}
		const item = await budgetTemplateItemsRepo.updateBudgetTemplateItem(
			req.params.itemId,
			req.params.id,
			{
				planned_amount: body.plannedAmount,
				account_id: body.accountId,
			},
		)
		if (!item) {
			res.status(404).json({ error: 'Budget template item not found' })
			return
		}
		res.json(item)
	} catch (err) {
		console.error('updateBudgetTemplateItem', err)
		res.status(500).json({ error: 'Failed to update budget template item' })
	}
})

router.delete('/:id/items/:itemId', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const template = await budgetTemplatesRepo.getBudgetTemplateById(
			req.params.id,
			userId,
		)
		if (!template) {
			res.status(404).json({ error: 'Budget template not found' })
			return
		}
		const deleted = await budgetTemplateItemsRepo.deleteBudgetTemplateItem(
			req.params.itemId,
			req.params.id,
		)
		if (!deleted) {
			res.status(404).json({ error: 'Budget template item not found' })
			return
		}
		res.status(204).send()
	} catch (err) {
		console.error('deleteBudgetTemplateItem', err)
		res.status(500).json({ error: 'Failed to delete budget template item' })
	}
})

router.post('/:id/apply', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const templateId = req.params.id
		const template = await budgetTemplatesRepo.getBudgetTemplateById(
			templateId,
			userId,
		)
		if (!template) {
			res.status(404).json({ error: 'Budget template not found' })
			return
		}
		const body = req.body as { month: number; year: number }
		const { month, year } = body
		if (
			typeof month !== 'number' ||
			typeof year !== 'number' ||
			month < 1 ||
			month > 12
		) {
			res.status(400).json({
				error: 'Invalid month or year; expected { month: 1-12, year: number }',
			})
			return
		}
		const budget = await budgetsRepo.findOrCreateMonthlyBudget(
			userId,
			month,
			year,
			template.baseCurrencyCode,
		)
		const templateItems =
			await budgetTemplateItemsRepo.listBudgetTemplateItemsByTemplateId(
				templateId,
			)
		await budgetItemsRepo.deleteBudgetItemsByBudgetId(budget.id)
		for (const item of templateItems) {
			await budgetItemsRepo.createBudgetItem({
				budget_id: budget.id,
				category_id: item.categoryId,
				planned_amount: item.plannedAmount,
				account_id: item.accountId ?? null,
			})
		}
		res.status(201).json(budget)
	} catch (err) {
		console.error('applyBudgetTemplate', err)
		res.status(500).json({ error: 'Failed to apply budget template' })
	}
})

export default router
