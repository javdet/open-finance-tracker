import { useState, useEffect, useCallback, useRef } from 'react'
import type { Account, Category } from '@/types'
import type { OperationType } from '@/types/operation'
import { fetchCategories, createOperation } from '@/api'

const DEFAULT_USER_ID = '1'

/** Parse amount string: number or sum of numbers (e.g. "12 + 33"). */
function parseAmount(value: string): number | null {
	const trimmed = value.trim()
	if (!trimmed) return null
	const num = Number(trimmed)
	if (!Number.isNaN(num)) return num
	const parts = trimmed.split(/\s*\+\s*/).map((p) => Number(p.trim()))
	if (parts.length > 1 && parts.every((n) => !Number.isNaN(n))) {
		return parts.reduce((a, b) => a + b, 0)
	}
	return null
}

interface AddOperationModalProps {
	isOpen: boolean
	onClose: () => void
	accounts: Account[]
	onSuccess?: () => void
}

/** Build ordered list for dropdown: top-level first, then their children, then by group. */
function orderedCategoriesForType(categories: Category[], type: 'expense' | 'income'): Category[] {
	const byType = categories.filter((c) => c.type === type)
	const topLevel = byType
		.filter((c) => !c.groupId && !c.parentCategoryId)
		.sort((a, b) => a.name.localeCompare(b.name))
	const withParent = byType.filter((c) => c.parentCategoryId)
	const withGroup = byType.filter((c) => c.groupId)
	const groupIds = [...new Set(withGroup.map((c) => c.groupId).filter(Boolean))] as string[]
	const out: Category[] = []
	topLevel.forEach((parent) => {
		out.push(parent)
		out.push(
			...withParent
				.filter((c) => c.parentCategoryId === parent.id)
				.sort((a, b) => a.name.localeCompare(b.name)),
		)
	})
	groupIds.forEach((gid) => {
		out.push(
			...withGroup
				.filter((c) => c.groupId === gid)
				.sort((a, b) => a.name.localeCompare(b.name)),
		)
	})
	return out
}

export function AddOperationModal({
	isOpen,
	onClose,
	accounts,
	onSuccess,
}: AddOperationModalProps) {
	const [transactionType, setTransactionType] = useState<'expense' | 'income' | 'transfer'>('expense')
	const [categoryId, setCategoryId] = useState<string>('')
	const [categories, setCategories] = useState<Category[]>([])
	const [categorySearch, setCategorySearch] = useState('')
	const [amount, setAmount] = useState('')
	const [date, setDate] = useState('')
	const [accountId, setAccountId] = useState('')
	const [transferAccountId, setTransferAccountId] = useState('')
	const [notes, setNotes] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [isCategoryOpen, setIsCategoryOpen] = useState(false)
	const categoryDropdownRef = useRef<HTMLDivElement>(null)

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
			return () => document.removeEventListener('mousedown', handleClickOutside)
		}
	}, [isCategoryOpen])

	useEffect(() => {
		if (isOpen) {
			fetchCategories({ userId: DEFAULT_USER_ID })
				.then(setCategories)
				.catch(() => setCategories([]))
			const today = new Date()
			setDate(
				[
					today.getFullYear(),
					(today.getMonth() + 1).toString().padStart(2, '0'),
					today.getDate().toString().padStart(2, '0'),
				].join('-'),
			)
		}
	}, [isOpen])

	useEffect(() => {
		setCategoryId('')
		setCategorySearch('')
	}, [transactionType])

	useEffect(() => {
		if (isOpen && accounts.length > 0 && !accountId) {
			setAccountId(accounts[0].id)
		}
	}, [isOpen, accounts, accountId])

	const selectedAccount = accounts.find((a) => a.id === accountId)
	const currencyCode = selectedAccount?.currencyCode ?? 'USD'

	const resetForm = useCallback(() => {
		setAmount('')
		setDate('')
		setNotes('')
		setError(null)
		setTransferAccountId('')
	}, [])

	const handleSubmit = useCallback(async () => {
		setError(null)
		const amountNum = parseAmount(amount)
		if (amountNum === null || amountNum <= 0) {
			setError('Please enter a valid amount.')
			return
		}
		if (!date.trim()) {
			setError('Please select a date.')
			return
		}
		if (!accountId) {
			setError('Please select an account.')
			return
		}
		if (transactionType === 'transfer' && !transferAccountId) {
			setError('Please select the destination account for the transfer.')
			return
		}
		if (transactionType === 'transfer' && transferAccountId === accountId) {
			setError('Source and destination accounts must be different.')
			return
		}
		if (
			(transactionType === 'expense' || transactionType === 'income') &&
			!categoryId
		) {
			setError('Please select a category.')
			return
		}
		const apiType: OperationType =
			transactionType === 'expense' ? 'payment' : transactionType
		const operationTime = `${date}T12:00:00.000Z`
		setIsSubmitting(true)
		try {
			await createOperation(
				{
					operationType: apiType,
					operationTime,
					accountId,
					transferAccountId:
						transactionType === 'transfer' ? transferAccountId : null,
					categoryId:
						transactionType === 'expense' || transactionType === 'income'
							? categoryId || null
							: null,
					amount:
						transactionType === 'income'
							? Math.abs(amountNum)
							: -Math.abs(amountNum),
					currencyCode,
					notes: notes.trim() || null,
				},
				{ userId: DEFAULT_USER_ID },
			)
			resetForm()
			onSuccess?.()
			onClose()
			window.dispatchEvent(new CustomEvent('operation-created'))
		} catch (err) {
			setError('Failed to save transaction. Please try again.')
		} finally {
			setIsSubmitting(false)
		}
	}, [
		amount,
		date,
		accountId,
		transferAccountId,
		transactionType,
		categoryId,
		notes,
		currencyCode,
		resetForm,
		onSuccess,
		onClose,
	])

	const categoryOptions =
		transactionType === 'expense'
			? orderedCategoriesForType(categories, 'expense')
			: transactionType === 'income'
				? orderedCategoriesForType(categories, 'income')
				: []

	const showCategory = transactionType === 'expense' || transactionType === 'income'

	if (!isOpen) {
		return null
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			<div
				className="absolute inset-0 bg-black/40"
				onClick={onClose}
				aria-hidden="true"
			/>
			<div className="relative z-10 w-full max-w-3xl bg-white border border-gray-200 rounded-md shadow-xl">
				<header className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
					<h2 className="text-sm font-semibold tracking-wide text-gray-900 uppercase">
						Add Transaction
					</h2>
					<button
						type="button"
						onClick={onClose}
						className="inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700"
						aria-label="Close add transaction window"
					>
						✕
					</button>
				</header>

				<div className="px-6 py-4 space-y-4">
					{error && (
						<div
							className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
							role="alert"
						>
							{error}
						</div>
					)}
					<div className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4 items-start">
						<div>
							<label className="block text-xs font-medium text-gray-700 mb-1">
								Amount:
							</label>
							<input
								type="text"
								value={amount}
								onChange={(e) => setAmount(e.target.value)}
								className="block w-full rounded border border-gray-300 px-2 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
								placeholder="e.g. 100 or 12 + 33"
							/>
							<p className="mt-1 text-[11px] text-gray-500">
								Example: 12 + 33 + 45
							</p>
						</div>
						<div>
							<label className="block text-xs font-medium text-gray-700 mb-1">
								Date:
							</label>
							<input
								type="date"
								value={date}
								onChange={(e) => setDate(e.target.value)}
								className="block w-full rounded border border-gray-300 px-2 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
							/>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-xs font-medium text-gray-700 mb-1">
								Account:
							</label>
							<select
								value={accountId}
								onChange={(e) => setAccountId(e.target.value)}
								className="block w-full rounded border border-gray-300 px-2 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
							>
								{accounts.map((account) => (
									<option key={account.id} value={account.id}>
										{account.name} ({account.currencyCode})
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="block text-xs font-medium text-gray-700 mb-1">
								Transaction Type:
							</label>
							<select
								value={transactionType}
								onChange={(e) =>
									setTransactionType(
										e.target.value as
											| 'expense'
											| 'income'
											| 'transfer',
									)
								}
								className="block w-full rounded border border-gray-300 px-2 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
							>
								<option value="expense">Expense</option>
								<option value="income">Income</option>
								<option value="transfer">Transfer</option>
							</select>
						</div>
					</div>

					{showCategory && (
						<div ref={categoryDropdownRef} className="relative">
							<label className="block text-xs font-medium text-gray-700 mb-1">
								Category:
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
								className="block w-full rounded border border-gray-300 px-2 py-1 text-sm shadow-sm text-left focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 flex items-center justify-between gap-2"
								aria-haspopup="listbox"
								aria-expanded={isCategoryOpen}
								aria-label="Select category"
							>
								<span className="truncate">
									{categoryId
										? categoryOptions.find((c) => c.id === categoryId)?.name ??
											'— Select category —'
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
									{categoryOptions
										.filter((cat) => {
											if (!categorySearch.trim()) {
												return true
											}
											return cat.name
												.toLowerCase()
												.includes(categorySearch.toLowerCase())
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
					)}

					{transactionType === 'transfer' && (
						<div>
							<label className="block text-xs font-medium text-gray-700 mb-1">
								Transfer to account:
							</label>
							<select
								value={transferAccountId}
								onChange={(e) => setTransferAccountId(e.target.value)}
								className="block w-full rounded border border-gray-300 px-2 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
							>
								<option value="">— Select account —</option>
								{accounts
									.filter((a) => a.id !== accountId)
									.map((account) => (
										<option key={account.id} value={account.id}>
											{account.name} ({account.currencyCode})
										</option>
									))}
							</select>
						</div>
					)}

					<div>
						<label className="block text-xs font-medium text-gray-700 mb-1">
							Comments:
						</label>
						<textarea
							rows={3}
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							className="block w-full resize-none rounded border border-gray-300 px-2 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
						/>
					</div>
				</div>

				<footer className="flex items-center justify-between px-6 py-3 border-t border-gray-200">
					<p className="text-[11px] text-gray-500">
						Confirm transaction with Ctrl+Enter
					</p>
					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={onClose}
							className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100"
							aria-label="Cancel transaction creation"
						>
							✕
						</button>
						<button
							type="button"
							onClick={handleSubmit}
							disabled={isSubmitting}
							className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 disabled:pointer-events-none"
							aria-label="Save Transaction"
						>
							✓
						</button>
					</div>
				</footer>
			</div>
		</div>
	)
}

