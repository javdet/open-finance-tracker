/**
 * REST route for budget vs actual report.
 */
import { Router, type Request, type Response } from 'express'
import * as budgetVsActualService from '../services/budget-vs-actual.js'

const router = Router()

function getUserId(req: Request): string {
	const id = req.headers['x-user-id'] ?? req.query.userId
	if (typeof id === 'string') return id
	return '1'
}

router.get('/:budgetId/budget-vs-actual', async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req)
		const report = await budgetVsActualService.getBudgetVsActualReport(
			req.params.budgetId,
			userId,
		)
		if (!report) {
			res.status(404).json({ error: 'Budget not found' })
			return
		}
		res.json(report)
	} catch (err) {
		console.error('getBudgetVsActualReport', err)
		res.status(500).json({ error: 'Failed to get budget vs actual report' })
	}
})

export default router
