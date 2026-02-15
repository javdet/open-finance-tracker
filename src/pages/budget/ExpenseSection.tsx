import { useState, useEffect } from 'react'
import type { BudgetItem, Category, BudgetVsActualReport } from '@/types'
import { fetchBudgetItems } from '@/api/budgets'
import { fetchCategories } from '@/api'
import { BudgetItemRow } from './BudgetItemRow'
import { AddExpenseItemModal } from './AddExpenseItemModal'
import { clsx } from '@/lib/clsx'

const DEFAULT_USER_ID = '1'

interface ExpenseSectionProps {
	budgetId: string
	report: BudgetVsActualReport | null
	onRefresh: () => void
}

function formatMoney(amount: number, currencyCode: string): string {
	try {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: currencyCode,
			minimumFractionDigits: 0,
			maximumFractionDigits: 2,
		}).format(amount)
	} catch {
		const formatted = new Intl.NumberFormat('en-US', {
			minimumFractionDigits: 0,
			maximumFractionDigits: 2,
		}).format(amount)
		return `${formatted} ${currencyCode}`
	}
}

export function ExpenseSection({
	budgetId,
	report,
	onRefresh,
}: ExpenseSectionProps) {
	const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([])
	const [categories, setCategories] = useState<Category[]>([])
	const [isAddModalOpen, setIsAddModalOpen] = useState(false)
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		Promise.all([
			fetchBudgetItems(budgetId, { userId: DEFAULT_USER_ID }),
			fetchCategories({ userId: DEFAULT_USER_ID }),
		])
			.then(([items, cats]) => {
				setBudgetItems(items)
				setCategories(cats)
			})
			.catch(() => {
				setBudgetItems([])
				setCategories([])
			})
			.finally(() => setIsLoading(false))
	}, [budgetId])

	// Filter to expense categories only
	const expenseItems = budgetItems.filter((item) => {
		const category = categories.find((c) => c.id === item.categoryId)
		return category?.type === 'expense'
	})

	// Create map of actual amounts by category
	const actualByCategory = new Map<string, number>()
	if (report) {
		report.rows.forEach((row) => {
			const category = categories.find((c) => c.id === row.categoryId)
			if (category?.type === 'expense') {
				actualByCategory.set(row.categoryId, row.actualAmount)
			}
		})
	}

	// Calculate totals
	const totalPlanned = expenseItems.reduce(
		(sum, item) => sum + item.plannedAmount,
		0,
	)
	const totalActual = expenseItems.reduce(
		(sum, item) => sum + (actualByCategory.get(item.categoryId) ?? 0),
		0,
	)
	const totalDifference = totalPlanned - totalActual

	const currencyCode = report?.baseCurrencyCode ?? 'USD'

	function handleAddSuccess() {
		setIsAddModalOpen(false)
		// Refresh budget items
		fetchBudgetItems(budgetId, { userId: DEFAULT_USER_ID })
			.then(setBudgetItems)
			.catch(() => setBudgetItems([]))
		onRefresh()
	}

	function handleItemUpdate() {
		// Refresh budget items
		fetchBudgetItems(budgetId, { userId: DEFAULT_USER_ID })
			.then(setBudgetItems)
			.catch(() => setBudgetItems([]))
		onRefresh()
	}

	if (isLoading) {
		return (
			<div className="text-sm text-gray-500 py-4">
				Loading expense data...
			</div>
		)
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h3 className="text-base font-semibold text-gray-900">
					Expenses
				</h3>
				<button
					type="button"
					onClick={() => setIsAddModalOpen(true)}
					className="px-3 py-1.5 text-sm font-medium text-white bg-rose-600 rounded-md hover:bg-rose-700 active:scale-95 transition-all duration-150 shadow-sm hover:shadow"
				>
					+ Add Expense
				</button>
			</div>
			<div className="rounded-md border border-gray-200 bg-white overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full table-fixed border-collapse text-sm">
						<colgroup>
							<col className="w-[40%]" />
							<col className="w-[17%]" />
							<col className="w-[17%]" />
							<col className="w-[17%]" />
							<col className="w-[48px]" />
						</colgroup>
						<thead className="bg-gray-50">
							<tr className="text-left text-gray-600">
								<th className="border-b border-gray-200 px-4 py-2 font-medium">
									Category
								</th>
								<th className="border-b border-gray-200 px-4 py-2 text-right font-medium">
									Planned, $
								</th>
								<th className="border-b border-gray-200 px-4 py-2 text-right font-medium">
									Actual, $
								</th>
								<th className="border-b border-gray-200 px-4 py-2 text-right font-medium">
									Difference, $
								</th>
								<th className="border-b border-gray-200 px-4 py-2"></th>
							</tr>
						</thead>
						<tbody>
							{expenseItems.length === 0 ? (
								<tr>
									<td
										colSpan={5}
										className="px-4 py-8 text-center text-gray-500"
									>
										No expense items yet. Click &quot;+ Add
										Expense&quot; to get started.
									</td>
								</tr>
							) : (
								expenseItems.map((item) => {
									const category = categories.find(
										(c) => c.id === item.categoryId,
									)
									if (!category) return null
									return (
										<BudgetItemRow
											key={item.id}
											item={item}
											category={category}
											actualAmount={
												actualByCategory.get(
													item.categoryId,
												) ?? 0
											}
											currencyCode={currencyCode}
											onUpdate={handleItemUpdate}
											onDelete={handleItemUpdate}
										/>
									)
								})
							)}
						</tbody>
						{expenseItems.length > 0 && (
							<tfoot className="bg-gray-50 font-medium">
								<tr className="border-t-2 border-gray-200">
									<td className="px-4 py-2 text-gray-900">
										Total
									</td>
									<td className="px-4 py-2 text-right text-gray-900">
										{formatMoney(
											totalPlanned,
											currencyCode,
										)}
									</td>
									<td className="px-4 py-2 text-right text-gray-900">
										{formatMoney(
											totalActual,
											currencyCode,
										)}
									</td>
									<td
										className={clsx(
											'px-4 py-2 text-right',
											totalDifference > 0
												? 'text-emerald-600'
												: totalDifference < 0
													? 'text-red-600'
													: 'text-gray-900',
										)}
									>
										{formatMoney(
											totalDifference,
											currencyCode,
										)}
									</td>
									<td className="px-4 py-2"></td>
								</tr>
							</tfoot>
						)}
					</table>
				</div>
			</div>
			<AddExpenseItemModal
				isOpen={isAddModalOpen}
				onClose={() => setIsAddModalOpen(false)}
				onSuccess={handleAddSuccess}
				budgetId={budgetId}
			/>
		</div>
	)
}
