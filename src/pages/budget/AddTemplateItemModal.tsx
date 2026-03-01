import { useState, useEffect, useCallback, useRef } from 'react'
import type { Category, CategoryType, CreateBudgetTemplateItemInput } from '@/types'
import { createTemplateItem } from '@/api/budget-templates'
import { fetchCategories } from '@/api'

interface AddTemplateItemModalProps {
	isOpen: boolean
	onClose: () => void
	onSuccess: () => void
	templateId: string
	direction: CategoryType
	/** Category IDs already in this template section (cannot select again). */
	excludeCategoryIds?: string[]
}

export function AddTemplateItemModal({
	isOpen,
	onClose,
	onSuccess,
	templateId,
	direction,
	excludeCategoryIds = [],
}: AddTemplateItemModalProps) {
	const [categoryId, setCategoryId] = useState<string>('')
	const [plannedAmount, setPlannedAmount] = useState<string>('')
	const [categories, setCategories] = useState<Category[]>([])
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [isCategoryOpen, setIsCategoryOpen] = useState(false)
	const [categorySearch, setCategorySearch] = useState('')
	const categoryDropdownRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (isOpen) {
			fetchCategories()
				.then((cats) => {
					const byType = cats.filter((c) => c.type === direction)
					const topLevel = byType
						.filter((c) => !c.groupId && !c.parentCategoryId)
						.sort((a, b) => a.name.localeCompare(b.name))
					const withParent = byType.filter((c) => c.parentCategoryId)
					const withGroup = byType.filter((c) => c.groupId)
					const groupIds = [
						...new Set(
							withGroup.map((c) => c.groupId).filter(Boolean),
						),
					] as string[]
					const ordered: Category[] = []
					topLevel.forEach((parent) => {
						ordered.push(parent)
						ordered.push(
							...withParent
								.filter(
									(c) => c.parentCategoryId === parent.id,
								)
								.sort((a, b) => a.name.localeCompare(b.name)),
						)
					})
					groupIds.forEach((gid) => {
						ordered.push(
							...withGroup
								.filter((c) => c.groupId === gid)
								.sort((a, b) => a.name.localeCompare(b.name)),
						)
					})
					setCategories(ordered)
				})
				.catch(() => setCategories([]))
		}
	}, [isOpen, direction])

	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (
				categoryDropdownRef.current &&
				!categoryDropdownRef.current.contains(event.target as Node)
			) {
				setIsCategoryOpen(false)
				setCategorySearch('')
			}
		}
		if (isCategoryOpen) {
			document.addEventListener('mousedown', handleClickOutside)
			return () =>
				document.removeEventListener('mousedown', handleClickOutside)
		}
	}, [isCategoryOpen])

	const resetForm = useCallback(() => {
		setCategoryId('')
		setPlannedAmount('')
		setError(null)
		setIsCategoryOpen(false)
		setCategorySearch('')
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
		if (
			!trimmedAmount ||
			isNaN(Number(trimmedAmount)) ||
			Number(trimmedAmount) <= 0
		) {
			setError('Planned amount must be a positive number')
			return
		}
		setError(null)
		setIsSubmitting(true)
		const payload: CreateBudgetTemplateItemInput = {
			categoryId,
			plannedAmount: Number(trimmedAmount),
		}
		createTemplateItem(templateId, payload)
			.then(() => {
				handleClose()
				onSuccess()
			})
			.catch((err: Error) => {
				setError(err.message || 'Failed to add item')
			})
			.finally(() => setIsSubmitting(false))
	}

	if (!isOpen) {
		return null
	}

	const title = direction === 'income' ? 'Add Income' : 'Add Expense'

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
						{title}
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
					<div ref={categoryDropdownRef} className="relative">
						<label className="block text-xs font-medium text-gray-700 mb-1">
							Category <span className="text-red-500">*</span>
						</label>
						<button
							type="button"
							onClick={() => {
								if (isCategoryOpen) {
									setIsCategoryOpen(false)
									setCategorySearch('')
								} else {
									setIsCategoryOpen(true)
								}
							}}
							className="block w-full rounded border border-gray-300 px-2 py-1.5 text-sm shadow-sm text-left focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 flex items-center justify-between gap-2"
							aria-haspopup="listbox"
							aria-expanded={isCategoryOpen}
							aria-label="Select category"
						>
							<span className="truncate">
								{categoryId
									? categories.find((c) => c.id === categoryId)
											?.name ?? '— Select category —'
									: '— Select category —'}
							</span>
							<span
								className={`shrink-0 text-gray-400 transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`}
								aria-hidden
							>
								▾
							</span>
						</button>
						{isCategoryOpen && (
							<ul
								role="listbox"
								className="absolute z-20 mt-1 w-full max-h-60 overflow-auto rounded border border-gray-200 bg-white py-1 shadow-lg"
								aria-label="Category options"
							>
								<li className="px-2 pb-1">
									<input
										type="text"
										value={categorySearch}
										onChange={(e) =>
											setCategorySearch(e.target.value)
										}
										autoFocus
										placeholder="Type to filter categories…"
										className="w-full rounded border border-gray-300 px-2 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
									/>
								</li>
								<li
									role="option"
									aria-selected={!categoryId}
									className="cursor-pointer px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
									onClick={() => {
										setCategoryId('')
										setIsCategoryOpen(false)
										setCategorySearch('')
									}}
								>
									— Select category —
								</li>
								{categories
									.filter((cat) => {
										if (excludeCategoryIds.includes(cat.id)) {
											return false
										}
										if (!categorySearch.trim()) return true
										return cat.name
											.toLowerCase()
											.includes(
												categorySearch.toLowerCase(),
											)
									})
									.map((cat) => (
										<li
											key={cat.id}
											role="option"
											aria-selected={categoryId === cat.id}
											className={`cursor-pointer px-2 py-1.5 text-sm hover:bg-gray-100 ${categoryId === cat.id ? 'bg-emerald-50 text-emerald-800' : 'text-gray-700'} ${cat.parentCategoryId ? 'pl-4 font-normal' : 'font-semibold'}`}
											onClick={() => {
												setCategoryId(cat.id)
												setIsCategoryOpen(false)
												setCategorySearch('')
											}}
										>
											{cat.name}
										</li>
									))}
							</ul>
						)}
					</div>
					<div>
						<label
							htmlFor="template-planned-amount"
							className="block text-xs font-medium text-gray-700 mb-1"
						>
							Planned Amount ($) <span className="text-red-500">*</span>
						</label>
						<input
							id="template-planned-amount"
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
							{isSubmitting ? 'Adding...' : title}
						</button>
					</div>
				</form>
			</div>
		</div>
	)
}
