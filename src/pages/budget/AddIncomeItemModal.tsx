import { useState, useEffect, useCallback } from 'react'
import type { Category, CreateBudgetItemInput } from '@/types'
import { createBudgetItem } from '@/api/budgets'
import { fetchCategories } from '@/api'

const DEFAULT_USER_ID = '1'

interface AddIncomeItemModalProps {
	isOpen: boolean
	onClose: () => void
	onSuccess: () => void
	budgetId: string
}

export function AddIncomeItemModal({
	isOpen,
	onClose,
	onSuccess,
	budgetId,
}: AddIncomeItemModalProps) {
	const [categoryId, setCategoryId] = useState<string>('')
	const [plannedAmount, setPlannedAmount] = useState<string>('')
	const [categories, setCategories] = useState<Category[]>([])
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		if (isOpen) {
			fetchCategories({ userId: DEFAULT_USER_ID })
				.then((cats) => {
					const incomeCategories = cats.filter((c) => c.type === 'income')
					setCategories(incomeCategories)
				})
				.catch(() => setCategories([]))
		}
	}, [isOpen])

	const resetForm = useCallback(() => {
		setCategoryId('')
		setPlannedAmount('')
		setError(null)
	}, [])

	const handleClose = useCallback(() => {
		resetForm()
		onClose()
	}, [onClose, resetForm])

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		const trimmedAmount = plannedAmount.trim()
		if (!categoryId) {
			setError('Category is required')
			return
		}
		if (!trimmedAmount || isNaN(Number(trimmedAmount)) || Number(trimmedAmount) <= 0) {
			setError('Planned amount must be a positive number')
			return
		}
		setError(null)
		setIsSubmitting(true)
		const payload: CreateBudgetItemInput = {
			categoryId,
			plannedAmount: Number(trimmedAmount),
		}
		createBudgetItem(budgetId, payload, { userId: DEFAULT_USER_ID })
			.then(() => {
				handleClose()
				onSuccess()
			})
			.catch((err: Error) => {
				setError(err.message || 'Failed to create budget item')
			})
			.finally(() => setIsSubmitting(false))
	}

	if (!isOpen) {
		return null
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
			<div
				className="absolute inset-0 bg-black/40 transition-opacity duration-200"
				onClick={handleClose}
				aria-hidden="true"
			/>
			<div className="relative z-10 w-full max-w-md bg-white border border-gray-200 rounded-md shadow-xl mx-4 transform transition-all duration-200 scale-100 animate-scale-in">
				<header className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
					<h2 className="text-sm font-semibold tracking-wide text-gray-900 uppercase">
						Add Income
					</h2>
					<button
						type="button"
						onClick={handleClose}
						className="inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
						aria-label="Close"
					>
						✕
					</button>
				</header>
				<form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
					{error && (
						<p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded animate-fade-in">
							{error}
						</p>
					)}
					<div>
						<label
							htmlFor="income-category"
							className="block text-xs font-medium text-gray-700 mb-1"
						>
							Category <span className="text-red-500">*</span>
						</label>
						<select
							id="income-category"
							value={categoryId}
							onChange={(e) => setCategoryId(e.target.value)}
							className="block w-full rounded border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
							autoFocus
						>
							<option value="">Select category</option>
							{categories.map((cat) => (
								<option key={cat.id} value={cat.id}>
									{cat.name}
								</option>
							))}
						</select>
					</div>
					<div>
						<label
							htmlFor="planned-amount"
							className="block text-xs font-medium text-gray-700 mb-1"
						>
							Planned Amount ($) <span className="text-red-500">*</span>
						</label>
						<input
							id="planned-amount"
							type="number"
							step="0.01"
							min="0"
							value={plannedAmount}
							onChange={(e) => setPlannedAmount(e.target.value)}
							placeholder="0.00"
							className="block w-full rounded border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
						/>
					</div>
					<div className="flex gap-2 justify-end pt-2">
						<button
							type="button"
							onClick={handleClose}
							className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isSubmitting}
							className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 border border-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							{isSubmitting ? 'Adding...' : 'Add Income'}
						</button>
					</div>
				</form>
			</div>
		</div>
	)
}
