import { useState } from 'react'
import type { BudgetTemplateItem, Category } from '@/types'
import { updateTemplateItem, deleteTemplateItem } from '@/api/budget-templates'
import { clsx } from '@/lib/clsx'

interface TemplateItemRowProps {
	item: BudgetTemplateItem
	category: Category
	currencyCode: string
	direction: 'income' | 'expense'
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

function TrashIcon() {
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
				d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
			/>
		</svg>
	)
}

export function TemplateItemRow({
	item,
	category,
	currencyCode,
	direction,
	onUpdate,
	onDelete,
}: TemplateItemRowProps) {
	const [isEditing, setIsEditing] = useState(false)
	const [plannedAmount, setPlannedAmount] = useState(
		item.plannedAmount.toString(),
	)
	const [isSaving, setIsSaving] = useState(false)
	const [isDeleting, setIsDeleting] = useState(false)

	function handleSave() {
		const amount = Number(plannedAmount)
		if (isNaN(amount) || amount <= 0) {
			setPlannedAmount(item.plannedAmount.toString())
			setIsEditing(false)
			return
		}
		setIsSaving(true)
		updateTemplateItem(item.templateId, item.id, { plannedAmount: amount })
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

	function handleDelete() {
		if (!confirm('Remove this item from the template?')) return
		setIsDeleting(true)
		deleteTemplateItem(item.templateId, item.id)
			.then(() => onDelete())
			.catch(() => setIsDeleting(false))
	}

	return (
		<tr className="border-b border-subtle hover:bg-surface-hover transition-colors animate-fade-in-slide-up">
			<td
				className="px-4 py-3 text-primary truncate"
				title={category.name}
			>
				{category.name}
			</td>
			<td className="px-4 py-3 text-right text-primary">
				{isEditing ? (
					<input
						type="number"
						step="0.01"
						min="0"
						value={plannedAmount}
						onChange={(e) => setPlannedAmount(e.target.value)}
						onBlur={handleSave}
						onKeyDown={(e) => {
							if (e.key === 'Enter') {
								handleSave()
							} else if (e.key === 'Escape') {
								setPlannedAmount(item.plannedAmount.toString())
								setIsEditing(false)
							}
						}}
						className="w-24 text-right rounded border border-strong bg-surface-card text-primary px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
						autoFocus
						disabled={isSaving}
					/>
				) : (
					<button
						type="button"
						onClick={() => setIsEditing(true)}
						className={`text-right transition-colors ${direction === 'expense' ? 'hover:text-red-600' : 'hover:text-emerald-600'}`}
					>
						{formatMoney(item.plannedAmount, currencyCode)}
					</button>
				)}
			</td>
			<td className="px-4 py-3">
				<button
					type="button"
					onClick={handleDelete}
					disabled={isDeleting}
					className={clsx(
						'text-faint hover:text-rose-600 transition-colors disabled:opacity-50',
					)}
					aria-label="Remove item"
					title="Remove item"
				>
					<TrashIcon />
				</button>
			</td>
		</tr>
	)
}
