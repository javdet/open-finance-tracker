import { useState } from 'react'
import type { BudgetVsActualRow } from '@/types'
import { createBudgetItem } from '@/api/budgets'
import { clsx } from '@/lib/clsx'

interface ActualsOnlyBudgetRowProps {
	row: BudgetVsActualRow
	budgetId: string
	/** 'income': actual - plan. 'expense': plan - actual. */
	categoryDirection: 'income' | 'expense'
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
	categoryDirection,
	onSuccess,
}: ActualsOnlyBudgetRowProps) {
	const [isEditing, setIsEditing] = useState(false)
	const [plannedAmount, setPlannedAmount] = useState('')
	const [isSaving, setIsSaving] = useState(false)

	const currencyCode = row.currencyCode
	const difference =
		categoryDirection === 'income'
			? row.actualAmount - row.plannedAmount
			: row.plannedAmount - row.actualAmount

	function handleSave() {
		const amount = Number(plannedAmount)
		if (isNaN(amount) || amount <= 0) {
			return
		}
		setIsSaving(true)
		createBudgetItem(budgetId, {
			categoryId: row.categoryId,
			plannedAmount: amount,
		})
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
			<tr className="border-b border-subtle hover:bg-surface-hover bg-amber-50/50">
				<td
					className="px-4 py-3 text-primary truncate"
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
						className="w-24 text-right rounded border border-strong bg-surface-card text-primary px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
						autoFocus
						disabled={isSaving}
						placeholder="0"
					/>
				</td>
				<td className="px-4 py-3 text-right text-primary">
					{formatMoney(row.actualAmount, currencyCode)}
				</td>
				<td
					className={clsx(
						'px-4 py-3 text-right font-medium',
						difference > 0
							? 'text-positive'
							: difference < 0
								? 'text-negative'
								: 'text-secondary',
					)}
				>
					{formatMoney(difference, currencyCode)}
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
						className="text-sm font-medium text-secondary hover:text-secondary disabled:opacity-50"
					>
						Cancel
					</button>
				</td>
			</tr>
		)
	}

	return (
		<tr className="border-b border-subtle hover:bg-surface-hover">
			<td
				className="px-4 py-3 text-primary truncate"
				title={row.categoryName}
			>
				{row.categoryName}
			</td>
			<td className="px-4 py-3 text-right text-muted">
				<button
					type="button"
					onClick={() => setIsEditing(true)}
					className={`transition-colors ${categoryDirection === 'expense' ? 'hover:text-red-600' : 'hover:text-emerald-600'}`}
				>
					{formatMoney(0, currencyCode)}
				</button>
			</td>
			<td className="px-4 py-3 text-right text-primary">
				{formatMoney(row.actualAmount, currencyCode)}
			</td>
			<td
				className={clsx(
					'px-4 py-3 text-right font-medium',
					difference > 0
						? 'text-positive'
						: difference < 0
							? 'text-negative'
							: 'text-secondary',
				)}
			>
				{formatMoney(difference, currencyCode)}
			</td>
			<td className="px-4 py-3" />
		</tr>
	)
}
