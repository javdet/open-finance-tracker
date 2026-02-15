/**
 * REST routes for categories and category groups.
 */
import { Router, type Request, type Response } from 'express'
import * as categoriesRepo from '../repositories/categories.js'

const router = Router()

function getUserId(req: Request): string {
	const id = req.headers['x-user-id'] ?? req.query.userId
	if (typeof id === 'string') return id
	return '1'
}

router.get('/', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const categories = await categoriesRepo.listCategoriesByUser(userId)
		res.json(categories)
	} catch (err) {
		console.error('listCategories', err)
		res.status(500).json({ error: 'Failed to list categories' })
	}
})

router.get('/groups', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const groups = await categoriesRepo.listCategoryGroupsByUser(userId)
		res.json(groups)
	} catch (err) {
		console.error('listCategoryGroups', err)
		res.status(500).json({ error: 'Failed to list category groups' })
	}
})

router.post('/', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const body = req.body as {
			name: string
			type: string
			groupId?: string | null
			parentCategoryId?: string | null
			description?: string | null
		}
		if (!body.name || typeof body.name !== 'string') {
			res.status(400).json({ error: 'Name is required' })
			return
		}
		const direction = body.type === 'income' ? 'income' : 'expense'
		const category = await categoriesRepo.createCategory({
			user_id: userId,
			name: body.name.trim(),
			direction,
			group_id: body.groupId ?? null,
			parent_category_id: body.parentCategoryId ?? null,
			description: body.description ?? null,
		})
		res.status(201).json(category)
	} catch (err) {
		console.error('createCategory', err)
		res.status(500).json({ error: 'Failed to create category' })
	}
})

router.patch('/:id', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const body = req.body as {
			name?: string
			type?: string
			groupId?: string | null
			parentCategoryId?: string | null
			description?: string | null
		}
		const updates: categoriesRepo.UpdateCategoryRow = {}
		if (body.name !== undefined) {
			if (typeof body.name !== 'string' || !body.name.trim()) {
				res.status(400).json({ error: 'Name cannot be empty' })
				return
			}
			updates.name = body.name.trim()
		}
		if (body.type !== undefined) {
			updates.direction = body.type === 'income' ? 'income' : 'expense'
		}
		if (body.groupId !== undefined) {
			updates.group_id = body.groupId || null
		}
		if (body.parentCategoryId !== undefined) {
			updates.parent_category_id = body.parentCategoryId || null
		}
		if (body.description !== undefined) {
			updates.description = body.description ?? null
		}
		const category = await categoriesRepo.updateCategory(
			req.params.id,
			userId,
			updates,
		)
		if (!category) {
			res.status(404).json({ error: 'Category not found' })
			return
		}
		res.json(category)
	} catch (err) {
		console.error('updateCategory', err)
		res.status(500).json({ error: 'Failed to update category' })
	}
})

export default router
