import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../db/client.js', () => ({
	getPool: vi.fn(() => ({})),
}))

vi.mock('../repositories/budgets.js', () => ({
	getBudgetById: vi.fn(),
}))

vi.mock('../repositories/budget-items.js', () => ({
	getBudgetItemsWithCategoryNames: vi.fn(),
}))

vi.mock('../repositories/categories.js', () => ({
	listCategoriesByUser: vi.fn(),
}))

vi.mock('../repositories/operations.js', () => ({
	sumAmountInBaseByCategory: vi.fn(),
}))

vi.mock('../repositories/scheduled-transactions.js', () => ({
	getCategoryTotals: vi.fn(),
}))

vi.mock('../repositories/accounts.js', () => ({
	listAccountBalancesAtDate: vi.fn(),
}))

vi.mock('./exchange-rate-cache.js', () => ({
	ensureRatesForDate: vi.fn(),
}))

import { getBudgetVsActualReport } from './budget-vs-actual.js'
import * as accountsRepo from '../repositories/accounts.js'
import * as budgetsRepo from '../repositories/budgets.js'
import * as budgetItemsRepo from '../repositories/budget-items.js'
import * as categoriesRepo from '../repositories/categories.js'
import * as operationsRepo from '../repositories/operations.js'
import * as scheduledTxRepo from '../repositories/scheduled-transactions.js'

const mockListAccountBalancesAtDate =
	accountsRepo.listAccountBalancesAtDate as ReturnType<typeof vi.fn>
const mockGetBudgetById = budgetsRepo.getBudgetById as ReturnType<typeof vi.fn>
const mockGetBudgetItems = budgetItemsRepo.getBudgetItemsWithCategoryNames as ReturnType<typeof vi.fn>
const mockListCategories = categoriesRepo.listCategoriesByUser as ReturnType<typeof vi.fn>
const mockSumByCategory = operationsRepo.sumAmountInBaseByCategory as ReturnType<typeof vi.fn>
const mockScheduledTotals = scheduledTxRepo.getCategoryTotals as ReturnType<typeof vi.fn>

const USER_ID = 'user-1'
const BUDGET_ID = 'budget-1'

function makeBudget(overrides = {}) {
	return {
		id: BUDGET_ID,
		userId: USER_ID,
		name: 'Feb 2026',
		periodType: 'monthly',
		startDate: '2026-02-01',
		endDate: '2026-02-28',
		baseCurrencyCode: 'USD',
		notes: null,
		createdAt: '2026-02-01T00:00:00.000Z',
		...overrides,
	}
}

beforeEach(() => {
	vi.clearAllMocks()
})

describe('getBudgetVsActualReport', () => {
	it('returns null when budget is not found', async () => {
		mockGetBudgetById.mockResolvedValue(null)
		mockListAccountBalancesAtDate.mockResolvedValue([])

		const result = await getBudgetVsActualReport(BUDGET_ID, USER_ID)

		expect(result).toBeNull()
		expect(mockGetBudgetById).toHaveBeenCalledWith(
			BUDGET_ID,
			USER_ID,
			expect.anything(),
		)
	})

	it('computes correct variance (planned - actual) for budget items', async () => {
		mockGetBudgetById.mockResolvedValue(makeBudget())
		mockGetBudgetItems.mockResolvedValue([
			{
				category_id: 'cat-1',
				category_name: 'Groceries',
				planned_amount: '500',
				category_direction: 'expense',
			},
			{
				category_id: 'cat-2',
				category_name: 'Salary',
				planned_amount: '3000',
				category_direction: 'income',
			},
		])
		mockSumByCategory.mockImplementation(
			async (_uid: string, _from: string, _to: string, opType: string) => {
				if (opType === 'income') {
					return [{ category_id: 'cat-2', actual_amount: '2800' }]
				}
				return [{ category_id: 'cat-1', actual_amount: '450' }]
			},
		)
		mockListCategories.mockResolvedValue([])
		mockScheduledTotals.mockResolvedValue([])
		mockListAccountBalancesAtDate.mockResolvedValue([])

		const report = await getBudgetVsActualReport(BUDGET_ID, USER_ID)

		expect(report).not.toBeNull()
		const groceries = report!.rows.find((r) => r.categoryId === 'cat-1')
		const salary = report!.rows.find((r) => r.categoryId === 'cat-2')

		expect(groceries).toMatchObject({
			plannedAmount: 500,
			actualAmount: 450,
			variance: 50,
		})
		expect(salary).toMatchObject({
			plannedAmount: 3000,
			actualAmount: 2800,
			variance: 200,
		})
	})

	it('adds rows for categories with actuals but no budget item (planned=0)', async () => {
		mockGetBudgetById.mockResolvedValue(makeBudget())
		mockGetBudgetItems.mockResolvedValue([
			{
				category_id: 'cat-1',
				category_name: 'Groceries',
				planned_amount: '200',
				category_direction: 'expense',
			},
		])
		mockSumByCategory.mockImplementation(
			async (_uid: string, _from: string, _to: string, opType: string) => {
				if (opType === 'income') return []
				return [
					{ category_id: 'cat-1', actual_amount: '150' },
					{ category_id: 'cat-extra', actual_amount: '75' },
				]
			},
		)
		mockListCategories.mockResolvedValue([
			{
				id: 'cat-extra',
				userId: USER_ID,
				groupId: null,
				parentCategoryId: null,
				name: 'Entertainment',
				type: 'expense',
				description: null,
				isActive: true,
			},
		])
		mockScheduledTotals.mockResolvedValue([])
		mockListAccountBalancesAtDate.mockResolvedValue([])

		const report = await getBudgetVsActualReport(BUDGET_ID, USER_ID)

		expect(report).not.toBeNull()
		const entertainment = report!.rows.find(
			(r) => r.categoryId === 'cat-extra',
		)
		expect(entertainment).toMatchObject({
			categoryName: 'Entertainment',
			plannedAmount: 0,
			actualAmount: 75,
			variance: -75,
		})
	})

	it('separates income vs expense totals correctly', async () => {
		mockGetBudgetById.mockResolvedValue(makeBudget())
		mockGetBudgetItems.mockResolvedValue([
			{
				category_id: 'cat-inc',
				category_name: 'Salary',
				planned_amount: '5000',
				category_direction: 'income',
			},
			{
				category_id: 'cat-exp',
				category_name: 'Rent',
				planned_amount: '1500',
				category_direction: 'expense',
			},
		])
		mockSumByCategory.mockImplementation(
			async (_uid: string, _from: string, _to: string, opType: string) => {
				if (opType === 'income') {
					return [{ category_id: 'cat-inc', actual_amount: '4500' }]
				}
				return [{ category_id: 'cat-exp', actual_amount: '1500' }]
			},
		)
		mockListCategories.mockResolvedValue([])
		mockScheduledTotals.mockResolvedValue([])
		mockListAccountBalancesAtDate.mockResolvedValue([])

		const report = await getBudgetVsActualReport(BUDGET_ID, USER_ID)

		expect(report).not.toBeNull()
		expect(report!.incomeTotalPlanned).toBe(5000)
		expect(report!.incomeTotalActual).toBe(4500)
		expect(report!.expenseTotalPlanned).toBe(1500)
		expect(report!.expenseTotalActual).toBe(1500)
		expect(report!.totalPlanned).toBe(6500)
		expect(report!.totalActual).toBe(6000)
		expect(report!.totalVariance).toBe(500)
	})

	it('includes scheduled amounts per category in the report', async () => {
		mockGetBudgetById.mockResolvedValue(makeBudget())
		mockGetBudgetItems.mockResolvedValue([
			{
				category_id: 'cat-1',
				category_name: 'Groceries',
				planned_amount: '600',
				category_direction: 'expense',
			},
		])
		mockSumByCategory.mockResolvedValue([])
		mockListCategories.mockResolvedValue([])
		mockScheduledTotals.mockResolvedValue([
			{ categoryId: 'cat-1', monthlyTotal: 200 },
		])
		mockListAccountBalancesAtDate.mockResolvedValue([])

		const report = await getBudgetVsActualReport(BUDGET_ID, USER_ID)

		expect(report).not.toBeNull()
		const groceries = report!.rows.find((r) => r.categoryId === 'cat-1')
		expect(groceries!.scheduledAmount).toBe(200)
		expect(report!.expenseScheduledTotal).toBe(200)
		expect(report!.scheduledTotal).toBe(200)
	})

	it('populates report metadata from the budget', async () => {
		mockGetBudgetById.mockResolvedValue(makeBudget())
		mockGetBudgetItems.mockResolvedValue([])
		mockSumByCategory.mockResolvedValue([])
		mockListCategories.mockResolvedValue([])
		mockScheduledTotals.mockResolvedValue([])
		mockListAccountBalancesAtDate.mockResolvedValue([])

		const report = await getBudgetVsActualReport(BUDGET_ID, USER_ID)

		expect(report).not.toBeNull()
		expect(report!.budgetId).toBe(BUDGET_ID)
		expect(report!.budgetName).toBe('Feb 2026')
		expect(report!.startDate).toBe('2026-02-01')
		expect(report!.endDate).toBe('2026-02-28')
		expect(report!.baseCurrencyCode).toBe('USD')
	})

	it('includes accountBalanceAtPeriodStart (planned total = planned + accounts at start)', async () => {
		mockGetBudgetById.mockResolvedValue(makeBudget())
		mockGetBudgetItems.mockResolvedValue([
			{
				category_id: 'cat-inc',
				category_name: 'Salary',
				planned_amount: '5000',
				category_direction: 'income',
			},
			{
				category_id: 'cat-exp',
				category_name: 'Rent',
				planned_amount: '1500',
				category_direction: 'expense',
			},
		])
		mockSumByCategory.mockResolvedValue([])
		mockListCategories.mockResolvedValue([])
		mockScheduledTotals.mockResolvedValue([])
		mockListAccountBalancesAtDate.mockResolvedValue([
			{ id: 'acc-1', currencyCode: 'USD', balance: 2000 },
			{ id: 'acc-2', currencyCode: 'USD', balance: 500 },
		])

		const report = await getBudgetVsActualReport(BUDGET_ID, USER_ID)

		expect(report).not.toBeNull()
		expect(report!.accountBalanceAtPeriodStart).toBe(2500)
		expect(report!.incomeTotalPlanned).toBe(5000)
		expect(report!.expenseTotalPlanned).toBe(1500)
		expect(report!.incomeTotalPlanned - report!.expenseTotalPlanned).toBe(3500)
		// Planned total balance = 3500 + 2500 = 6000
	})
})
