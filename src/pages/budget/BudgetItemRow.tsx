import { useState } from 'react'
import type { BudgetItem, Category } from '@/types'
import { updateBudgetItem, deleteBudgetItem } from '@/api/budgets'
import { clsx } from '@/lib/clsx'

interface BudgetItemRowProps {
	item: BudgetItem
	category: Category
	actualAmount: number
	currencyCode: string
	scheduledAmount?: number
	/** 'income': actual - plan (negative when plan > actual). 'expense': plan - actual. */
	categoryDirection: 'income' | 'expense'
	onUpdate: () => void
	onDelete: () => void
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

function ResetIcon() {
	return (
		<svg
			className="w-4 h-4"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
				d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
			/>
		</svg>
	)
}

export function BudgetItemRow({
	item,
	category,
	actualAmount,
	currencyCode,
	scheduledAmount = 0,
	categoryDirection,
	onUpdate,
	onDelete,
}: BudgetItemRowProps) {
	const [isEditing, setIsEditing] = useState(false)
	const [plannedAmount, setPlannedAmount] = useState(item.plannedAmount.toString())
	const [isSaving, setIsSaving] = useState(false)
	const [isResetting, setIsResetting] = useState(false)
	const [minError, setMinError] = useState<string | null>(null)

	const difference =
		categoryDirection === 'income'
			? actualAmount - item.plannedAmount
			: item.plannedAmount - actualAmount
	const minPlanned = Math.abs(scheduledAmount)

	function handleSave() {
		setMinError(null)
		const amount = Number(plannedAmount)
		if (isNaN(amount) || amount <= 0) {
			setPlannedAmount(item.plannedAmount.toString())
			setIsEditing(false)
			return
		}
		if (minPlanned > 0 && amount < minPlanned) {
			setMinError(
				`Minimum ${formatMoney(minPlanned, currencyCode)} required by scheduled transactions`,
			)
			return
		}
		setIsSaving(true)
		updateBudgetItem(item.budgetId, item.id, { plannedAmount: amount })
			.then(() => {
				setIsEditing(false)
				onUpdate()
			})
			.catch(() => {
				setPlannedAmount(item.plannedAmount.toString())
				setIsEditing(false)
			})
			.finally(() => setIsSaving(false))
	}

	function handleResetPlan() {
		if (
			!confirm(
				'Reset the plan for this category? The category will stay in the list with actuals only.',
			)
		) {
			return
		}
		setIsResetting(true)
		deleteBudgetItem(item.budgetId, item.id)
			.then(() => {
				onDelete()
			})
			.catch(() => {
				setIsResetting(false)
			})
	}

	return (
		<tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors animate-fade-in-slide-up">
			<td className="px-4 py-3 text-gray-800 truncate" title={category.name}>
				<span>{category.name}</span>
				{minPlanned > 0 && (
					<span
						className="ml-1.5 inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 leading-none"
						title={`Scheduled: ${formatMoney(minPlanned, currencyCode)}/mo`}
					>
						sched {formatMoney(minPlanned, currencyCode)}
					</span>
				)}
			</td>
			<td className="px-4 py-3 text-right text-gray-800">
				{isEditing ? (
					<div className="inline-flex flex-col items-end gap-1">
						<input
							type="number"
							step="0.01"
							min={minPlanned > 0 ? minPlanned : 0}
							value={plannedAmount}
							onChange={(e) => {
								setPlannedAmount(e.target.value)
								setMinError(null)
							}}
							onBlur={handleSave}
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									handleSave()
								} else if (e.key === 'Escape') {
									setPlannedAmount(item.plannedAmount.toString())
									setMinError(null)
									setIsEditing(false)
								}
							}}
							className={clsx(
								'w-24 text-right rounded border px-2 py-1 text-sm focus:outline-none focus:ring-1',
								minError
									? 'border-red-400 focus:ring-red-500 focus:border-red-500'
									: 'border-gray-300 focus:ring-emerald-500 focus:border-emerald-500',
							)}
							autoFocus
							disabled={isSaving}
						/>
						{minError && (
							<span className="text-[10px] text-red-600 max-w-[180px] text-right leading-tight">
								{minError}
							</span>
						)}
					</div>
				) : (
					<button
						type="button"
						onClick={() => setIsEditing(true)}
						className="text-right hover:text-emerald-600 transition-colors"
					>
						{formatMoney(item.plannedAmount, currencyCode)}
					</button>
				)}
			</td>
			<td className="px-4 py-3 text-right text-gray-800">
				{formatMoney(actualAmount, currencyCode)}
			</td>
			<td
				className={clsx(
					'px-4 py-3 text-right font-medium',
					difference > 0
						? 'text-emerald-600'
						: difference < 0
							? 'text-red-600'
							: 'text-gray-600',
				)}
			>
				{formatMoney(difference, currencyCode)}
			</td>
			<td className="px-4 py-3">
				<button
					type="button"
					onClick={handleResetPlan}
					disabled={isResetting}
					className="text-gray-400 hover:text-amber-600 transition-colors disabled:opacity-50"
					aria-label="Reset plan"
					title="Reset plan"
				>
					<ResetIcon />
				</button>
			</td>
		</tr>
	)
}
