import { useState, useEffect } from 'react'
import type { BudgetTemplateItem, Category } from '@/types'
import { fetchTemplateItems } from '@/api/budget-templates'
import { fetchCategories } from '@/api'
import { TemplateItemRow } from './TemplateItemRow'
import { AddTemplateItemModal } from './AddTemplateItemModal'
import type { CategoryType } from '@/types'

const DEFAULT_USER_ID = '1'

interface TemplateSectionProps {
	templateId: string
	direction: CategoryType
	currencyCode: string
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

export function TemplateSection({
	templateId,
	direction,
	currencyCode,
	onRefresh,
}: TemplateSectionProps) {
	const [items, setItems] = useState<BudgetTemplateItem[]>([])
	const [categories, setCategories] = useState<Category[]>([])
	const [isAddModalOpen, setIsAddModalOpen] = useState(false)
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		Promise.all([
			fetchTemplateItems(templateId, { userId: DEFAULT_USER_ID }),
			fetchCategories({ userId: DEFAULT_USER_ID }),
		])
			.then(([templateItems, cats]) => {
				setItems(templateItems)
				setCategories(cats)
			})
			.catch(() => {
				setItems([])
				setCategories([])
			})
			.finally(() => setIsLoading(false))
	}, [templateId])

	const categoryType = direction
	const filteredItems = items.filter((item) => {
		const cat = categories.find((c) => c.id === item.categoryId)
		return cat?.type === categoryType
	})
	const totalPlanned = filteredItems.reduce(
		(sum, item) => sum + item.plannedAmount,
		0,
	)

	function handleAddSuccess() {
		setIsAddModalOpen(false)
		fetchTemplateItems(templateId, { userId: DEFAULT_USER_ID })
			.then(setItems)
			.catch(() => setItems([]))
		onRefresh()
	}

	function handleItemUpdate() {
		fetchTemplateItems(templateId, { userId: DEFAULT_USER_ID })
			.then(setItems)
			.catch(() => setItems([]))
		onRefresh()
	}

	if (isLoading) {
		return (
			<div className="text-sm text-gray-500 py-4">
				Loading {direction} data...
			</div>
		)
	}

	const title = direction === 'income' ? 'Income' : 'Expenses'
	const addLabel = direction === 'income' ? '+ Add Income' : '+ Add Expense'
	const emptyMessage =
		direction === 'income'
			? 'No income items yet. Click "+ Add Income" to get started.'
			: 'No expense items yet. Click "+ Add Expense" to get started.'
	const buttonClass =
		direction === 'income'
			? 'px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 active:scale-95 transition-all duration-150 shadow-sm hover:shadow'
			: 'px-3 py-1.5 text-sm font-medium text-white bg-rose-600 rounded-md hover:bg-rose-700 active:scale-95 transition-all duration-150 shadow-sm hover:shadow'

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h3 className="text-base font-semibold text-gray-900">{title}</h3>
				<button
					type="button"
					onClick={() => setIsAddModalOpen(true)}
					className={buttonClass}
				>
					{addLabel}
				</button>
			</div>
			<div className="rounded-md border border-gray-200 bg-white overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full table-fixed border-collapse text-sm">
						<colgroup>
							<col className="w-[60%]" />
							<col className="w-[25%]" />
							<col className="w-[48px]" />
						</colgroup>
						<thead className="bg-gray-50">
							<tr className="text-left text-gray-600">
								<th className="border-b border-gray-200 px-4 py-2 font-medium">
									Category
								</th>
								<th className="border-b border-gray-200 px-4 py-2 text-right font-medium">
									Planned
								</th>
								<th className="border-b border-gray-200 px-4 py-2"></th>
							</tr>
						</thead>
						<tbody>
							{filteredItems.length === 0 ? (
								<tr>
									<td
										colSpan={3}
										className="px-4 py-8 text-center text-gray-500"
									>
										{emptyMessage}
									</td>
								</tr>
							) : (
								filteredItems.map((item) => {
									const category = categories.find(
										(c) => c.id === item.categoryId,
									)
									if (!category) return null
									return (
										<TemplateItemRow
											key={item.id}
											item={item}
											category={category}
											currencyCode={currencyCode}
											onUpdate={handleItemUpdate}
											onDelete={handleItemUpdate}
										/>
									)
								})
							)}
						</tbody>
						{filteredItems.length > 0 && (
							<tfoot className="bg-gray-50 font-medium">
								<tr className="border-t-2 border-gray-200">
									<td className="px-4 py-2 text-gray-900">Total</td>
									<td className="px-4 py-2 text-right text-gray-900">
										{formatMoney(totalPlanned, currencyCode)}
									</td>
									<td className="px-4 py-2"></td>
								</tr>
							</tfoot>
						)}
					</table>
				</div>
			</div>
			<AddTemplateItemModal
				isOpen={isAddModalOpen}
				onClose={() => setIsAddModalOpen(false)}
				onSuccess={handleAddSuccess}
				templateId={templateId}
				direction={direction}
			/>
		</div>
	)
}
