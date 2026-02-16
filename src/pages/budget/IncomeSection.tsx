import { useState, useEffect } from 'react'
import type { BudgetItem, Category, BudgetVsActualReport } from '@/types'
import { fetchBudgetItems } from '@/api/budgets'
import { fetchCategories } from '@/api'
import { BudgetItemRow } from './BudgetItemRow'
import { AddIncomeItemModal } from './AddIncomeItemModal'
import { clsx } from '@/lib/clsx'

const DEFAULT_USER_ID = '1'

interface IncomeSectionProps {
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

export function IncomeSection({
	budgetId,
	report,
	onRefresh,
}: IncomeSectionProps) {
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

	// Use report rows for income so we show categories with actuals even without a budget item
	const incomeRows = report?.rows.filter((r) => r.categoryDirection === 'income') ?? []
	const budgetItemsByCategory = new Map(
		budgetItems.map((item) => [item.categoryId, item]),
	)

	// Totals from report when available, otherwise from income rows
	const totalPlanned = report
		? report.incomeTotalPlanned
		: incomeRows.reduce((sum, r) => sum + r.plannedAmount, 0)
	const totalActual = report
		? report.incomeTotalActual
		: incomeRows.reduce((sum, r) => sum + r.actualAmount, 0)
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
			<div className="text-sm text-gray-500 py-4">Loading income data...</div>
		)
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h3 className="text-base font-semibold text-gray-900">Income</h3>
				<button
					type="button"
					onClick={() => setIsAddModalOpen(true)}
					className="px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 active:scale-95 transition-all duration-150 shadow-sm hover:shadow"
				>
					+ Add Income
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
							{incomeRows.length === 0 ? (
								<tr>
									<td
										colSpan={5}
										className="px-4 py-8 text-center text-gray-500"
									>
										No income items yet. Click &quot;+ Add Income&quot; to get
										started.
									</td>
								</tr>
							) : (
								incomeRows.map((row) => {
									const item = budgetItemsByCategory.get(row.categoryId)
									const category = categories.find((c) => c.id === row.categoryId)
									if (item && category) {
										return (
											<BudgetItemRow
												key={item.id}
												item={item}
												category={category}
												actualAmount={row.actualAmount}
												currencyCode={currencyCode}
												onUpdate={handleItemUpdate}
												onDelete={handleItemUpdate}
											/>
										)
									}
									// Actuals-only row (no budget item)
									return (
										<tr
											key={row.categoryId}
											className="border-b border-gray-100 hover:bg-gray-50"
										>
											<td
												className="px-4 py-3 text-gray-800 truncate"
												title={row.categoryName}
											>
												{row.categoryName}
											</td>
											<td className="px-4 py-3 text-right text-gray-500">
												{formatMoney(0, currencyCode)}
											</td>
											<td className="px-4 py-3 text-right text-gray-800">
												{formatMoney(row.actualAmount, currencyCode)}
											</td>
											<td className="px-4 py-3 text-right text-red-600 font-medium">
												{formatMoney(-row.actualAmount, currencyCode)}
											</td>
											<td className="px-4 py-3" />
										</tr>
									)
								})
							)}
						</tbody>
						{incomeRows.length > 0 && (
							<tfoot className="bg-gray-50 font-medium">
								<tr className="border-t-2 border-gray-200">
									<td className="px-4 py-2 text-gray-900">Total</td>
									<td className="px-4 py-2 text-right text-gray-900">
										{formatMoney(totalPlanned, currencyCode)}
									</td>
									<td className="px-4 py-2 text-right text-gray-900">
										{formatMoney(totalActual, currencyCode)}
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
										{formatMoney(totalDifference, currencyCode)}
									</td>
									<td className="px-4 py-2"></td>
								</tr>
							</tfoot>
						)}
					</table>
				</div>
			</div>
			<AddIncomeItemModal
				isOpen={isAddModalOpen}
				onClose={() => setIsAddModalOpen(false)}
				onSuccess={handleAddSuccess}
				budgetId={budgetId}
			/>
		</div>
	)
}
