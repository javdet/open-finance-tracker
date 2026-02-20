import { useState } from 'react'
import type { BudgetVsActualRow } from '@/types'
import { createBudgetItem } from '@/api/budgets'
import { clsx } from '@/lib/clsx'

const DEFAULT_USER_ID = '1'

interface ActualsOnlyBudgetRowProps {
	row: BudgetVsActualRow
	budgetId: string
	onSuccess: () => void
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

export function ActualsOnlyBudgetRow({
	row,
	budgetId,
	onSuccess,
}: ActualsOnlyBudgetRowProps) {
	const [isEditing, setIsEditing] = useState(false)
	const [plannedAmount, setPlannedAmount] = useState('')
	const [isSaving, setIsSaving] = useState(false)

	const currencyCode = row.currencyCode

	function handleSave() {
		const amount = Number(plannedAmount)
		if (isNaN(amount) || amount <= 0) {
			return
		}
		setIsSaving(true)
		createBudgetItem(
			budgetId,
			{ categoryId: row.categoryId, plannedAmount: amount },
			{ userId: DEFAULT_USER_ID },
		)
			.then(() => {
				setIsEditing(false)
				setPlannedAmount('')
				onSuccess()
			})
			.catch(() => {})
			.finally(() => setIsSaving(false))
	}

	function handleCancel() {
		setIsEditing(false)
		setPlannedAmount('')
	}

	if (isEditing) {
		return (
			<tr className="border-b border-gray-100 hover:bg-gray-50 bg-amber-50/50">
				<td
					className="px-4 py-3 text-gray-800 truncate"
					title={row.categoryName}
				>
					{row.categoryName}
				</td>
				<td className="px-4 py-3 text-right">
					<input
						type="number"
						step="0.01"
						min="0"
						value={plannedAmount}
						onChange={(e) => setPlannedAmount(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Enter') {
								handleSave()
							} else if (e.key === 'Escape') {
								handleCancel()
							}
						}}
						className="w-24 text-right rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
						autoFocus
						disabled={isSaving}
						placeholder="0"
					/>
				</td>
				<td className="px-4 py-3 text-right text-gray-800">
					{formatMoney(row.actualAmount, currencyCode)}
				</td>
				<td className="px-4 py-3 text-right text-red-600 font-medium">
					{formatMoney(-row.actualAmount, currencyCode)}
				</td>
				<td className="px-4 py-3 flex items-center gap-1">
					<button
						type="button"
						onClick={handleSave}
						disabled={isSaving || !plannedAmount.trim()}
						className="text-sm font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
					>
						Save
					</button>
					<button
						type="button"
						onClick={handleCancel}
						disabled={isSaving}
						className="text-sm font-medium text-gray-600 hover:text-gray-700 disabled:opacity-50"
					>
						Cancel
					</button>
				</td>
			</tr>
		)
	}

	return (
		<tr className="border-b border-gray-100 hover:bg-gray-50">
			<td
				className="px-4 py-3 text-gray-800 truncate"
				title={row.categoryName}
			>
				{row.categoryName}
			</td>
			<td className="px-4 py-3 text-right text-gray-500">
				<button
					type="button"
					onClick={() => setIsEditing(true)}
					className="hover:text-emerald-600 transition-colors"
				>
					{formatMoney(0, currencyCode)}
				</button>
			</td>
			<td className="px-4 py-3 text-right text-gray-800">
				{formatMoney(row.actualAmount, currencyCode)}
			</td>
			<td
				className={clsx(
					'px-4 py-3 text-right font-medium',
					'text-red-600',
				)}
			>
				{formatMoney(-row.actualAmount, currencyCode)}
			</td>
			<td className="px-4 py-3" />
		</tr>
	)
}
