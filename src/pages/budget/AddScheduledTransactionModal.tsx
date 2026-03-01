import { useState, useEffect, useCallback, useRef } from 'react'
import type { Account, Category, RecurrencePeriod } from '@/types'
import { fetchCategories, fetchAccounts, createScheduledTransaction } from '@/api'

const RECURRENCE_OPTIONS: { value: RecurrencePeriod; label: string }[] = [
	{ value: 'daily', label: 'Daily' },
	{ value: 'weekly', label: 'Weekly' },
	{ value: 'biweekly', label: 'Biweekly' },
	{ value: 'monthly', label: 'Monthly' },
	{ value: 'quarterly', label: 'Quarterly' },
	{ value: 'yearly', label: 'Yearly' },
]

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

function orderedCategoriesForType(
	categories: Category[],
	type: 'expense' | 'income',
): Category[] {
	const byType = categories.filter((c) => c.type === type)
	const topLevel = byType
		.filter((c) => !c.groupId && !c.parentCategoryId)
		.sort((a, b) => a.name.localeCompare(b.name))
	const withParent = byType.filter((c) => c.parentCategoryId)
	const withGroup = byType.filter((c) => c.groupId)
	const groupIds = [
		...new Set(withGroup.map((c) => c.groupId).filter(Boolean)),
	] as string[]
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

interface AddScheduledTransactionModalProps {
	isOpen: boolean
	onClose: () => void
	onSuccess?: () => void
	initialDate?: string
}

export function AddScheduledTransactionModal({
	isOpen,
	onClose,
	onSuccess,
	initialDate,
}: AddScheduledTransactionModalProps) {
	const [name, setName] = useState('')
	const [transactionType, setTransactionType] = useState<
		'expense' | 'income'
	>('expense')
	const [amount, setAmount] = useState('')
	const [accountId, setAccountId] = useState('')
	const [categoryId, setCategoryId] = useState('')
	const [recurrencePeriod, setRecurrencePeriod] =
		useState<RecurrencePeriod>('monthly')
	const [startDate, setStartDate] = useState(() => {
		if (initialDate) return initialDate
		const today = new Date()
		return [
			today.getFullYear(),
			(today.getMonth() + 1).toString().padStart(2, '0'),
			today.getDate().toString().padStart(2, '0'),
		].join('-')
	})
	const [notifyPayment, setNotifyPayment] = useState(false)
	const [notes, setNotes] = useState('')

	const [accounts, setAccounts] = useState<Account[]>([])
	const [categories, setCategories] = useState<Category[]>([])
	const [error, setError] = useState<string | null>(null)
	const [isSubmitting, setIsSubmitting] = useState(false)

	const [isCategoryOpen, setIsCategoryOpen] = useState(false)
	const [categorySearch, setCategorySearch] = useState('')
	const categoryDropdownRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (isOpen) {
			Promise.all([
				fetchAccounts(),
				fetchCategories(),
			])
				.then(([accs, cats]) => {
					setAccounts(accs)
					setCategories(cats)
					if (accs.length > 0 && !accountId) {
						setAccountId(accs[0].id)
					}
				})
				.catch(() => {
					setAccounts([])
					setCategories([])
				})
		}
	}, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

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

	useEffect(() => {
		setCategoryId('')
		setCategorySearch('')
	}, [transactionType])

	const categoryOptions = orderedCategoriesForType(
		categories,
		transactionType,
	)

	const selectedAccount = accounts.find((a) => a.id === accountId)
	const currencyCode = selectedAccount?.currencyCode ?? 'USD'

	useEffect(() => {
		if (initialDate) {
			setStartDate(initialDate)
		}
	}, [initialDate])

	const resetForm = useCallback(() => {
		setName('')
		setTransactionType('expense')
		setAmount('')
		setAccountId('')
		setCategoryId('')
		setRecurrencePeriod('monthly')
		if (initialDate) {
			setStartDate(initialDate)
		} else {
			const today = new Date()
			setStartDate([
				today.getFullYear(),
				(today.getMonth() + 1).toString().padStart(2, '0'),
				today.getDate().toString().padStart(2, '0'),
			].join('-'))
		}
		setNotifyPayment(false)
		setNotes('')
		setError(null)
		setIsCategoryOpen(false)
		setCategorySearch('')
	}, [initialDate])

	const handleClose = useCallback(() => {
		resetForm()
		onClose()
	}, [onClose, resetForm])

	const handleSubmit = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault()
			setError(null)

			if (!name.trim()) {
				setError('Please enter a name for the scheduled transaction.')
				return
			}

			const amountNum = parseAmount(amount)
			if (amountNum === null || amountNum <= 0) {
				setError('Please enter a valid positive amount.')
				return
			}

			if (!accountId) {
				setError('Please select an account.')
				return
			}

			if (!categoryId) {
				setError('Please select a category.')
				return
			}

			if (!startDate.trim()) {
				setError('Please select a start date.')
				return
			}

			const operationType =
				transactionType === 'expense' ? 'payment' : 'income'
			const signedAmount =
				transactionType === 'expense'
					? -Math.abs(amountNum)
					: Math.abs(amountNum)

			setIsSubmitting(true)
			try {
				await createScheduledTransaction({
					name: name.trim(),
					operationType,
					categoryId,
					accountId,
					amount: signedAmount,
					currencyCode,
					recurrencePeriod,
					startDate,
					notifyPayment,
					notes: notes.trim() || null,
				})
				handleClose()
				onSuccess?.()
			} catch {
				setError(
					'Failed to create scheduled transaction. Please try again.',
				)
			} finally {
				setIsSubmitting(false)
			}
		},
		[
			name,
			amount,
			accountId,
			categoryId,
			transactionType,
			currencyCode,
			recurrencePeriod,
			startDate,
			notifyPayment,
			notes,
			handleClose,
			onSuccess,
		],
	)

	if (!isOpen) return null

	const typeBaseBtn =
		'flex-1 px-3 py-1.5 text-sm font-medium rounded-md border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-emerald-500'

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
			<div
				className="absolute inset-0 bg-black/40 transition-opacity duration-200"
				onClick={handleClose}
				aria-hidden="true"
			/>
			<div className="relative z-10 w-full max-w-lg bg-white border border-gray-200 rounded-md shadow-xl mx-4 transform transition-all duration-200 scale-100 animate-scale-in">
				<header className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
					<h2 className="text-sm font-semibold tracking-wide text-gray-900 uppercase">
						Add Scheduled Transaction
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
						<p
							className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded animate-fade-in"
							role="alert"
						>
							{error}
						</p>
					)}

					<div>
						<label
							htmlFor="sched-name"
							className="block text-xs font-medium text-gray-700 mb-1"
						>
							Name <span className="text-red-500">*</span>
						</label>
						<input
							id="sched-name"
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g. Netflix subscription"
							className="block w-full rounded border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
						/>
					</div>

					<div>
						<label className="block text-xs font-medium text-gray-700 mb-1">
							Type <span className="text-red-500">*</span>
						</label>
						<div className="flex gap-2">
							<button
								type="button"
								onClick={() => setTransactionType('expense')}
								className={`${typeBaseBtn} ${
									transactionType === 'expense'
										? 'border-red-500 bg-red-50 text-red-700'
										: 'border-gray-200 bg-white text-gray-500 hover:border-red-300 hover:bg-red-50/50'
								}`}
								aria-pressed={transactionType === 'expense'}
							>
								Expense
							</button>
							<button
								type="button"
								onClick={() => setTransactionType('income')}
								className={`${typeBaseBtn} ${
									transactionType === 'income'
										? 'border-green-500 bg-green-50 text-green-700'
										: 'border-gray-200 bg-white text-gray-500 hover:border-green-300 hover:bg-green-50/50'
								}`}
								aria-pressed={transactionType === 'income'}
							>
								Income
							</button>
						</div>
					</div>

					<div className={`grid grid-cols-1 ${initialDate ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-4`}>
						<div>
							<label
								htmlFor="sched-amount"
								className="block text-xs font-medium text-gray-700 mb-1"
							>
								Amount{' '}
								<span className="text-red-500">*</span>
							</label>
							<input
								id="sched-amount"
								type="text"
								value={amount}
								onChange={(e) => setAmount(e.target.value)}
								placeholder="e.g. 100 or 12 + 33"
								className="block w-full rounded border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
							/>
							<p className="mt-1 text-[11px] text-gray-500">
								Supports expressions: 12 + 33 + 45
							</p>
						</div>
						<div>
							<label
								htmlFor="sched-recurrence"
								className="block text-xs font-medium text-gray-700 mb-1"
							>
								Recurrence{' '}
								<span className="text-red-500">*</span>
							</label>
							<select
								id="sched-recurrence"
								value={recurrencePeriod}
								onChange={(e) =>
									setRecurrencePeriod(
										e.target.value as RecurrencePeriod,
									)
								}
								className="block w-full rounded border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
							>
								{RECURRENCE_OPTIONS.map((opt) => (
									<option key={opt.value} value={opt.value}>
										{opt.label}
									</option>
								))}
							</select>
						</div>
						{!initialDate && (
							<div>
								<label
									htmlFor="sched-start-date"
									className="block text-xs font-medium text-gray-700 mb-1"
								>
									Start Date{' '}
									<span className="text-red-500">*</span>
								</label>
								<input
									id="sched-start-date"
									type="date"
									value={startDate}
									onChange={(e) => setStartDate(e.target.value)}
									className="block w-full rounded border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
								/>
							</div>
						)}
					</div>

					<div>
						<label
							htmlFor="sched-account"
							className="block text-xs font-medium text-gray-700 mb-1"
						>
							Account <span className="text-red-500">*</span>
						</label>
						<select
							id="sched-account"
							value={accountId}
							onChange={(e) => setAccountId(e.target.value)}
							className="block w-full rounded border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
						>
							{accounts.length === 0 && (
								<option value="">Loading accounts...</option>
							)}
							{accounts.map((account) => (
								<option key={account.id} value={account.id}>
									{account.name} ({account.currencyCode})
								</option>
							))}
						</select>
					</div>

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
									? (categoryOptions.find(
											(c) => c.id === categoryId,
										)?.name ?? '-- Select category --')
									: '-- Select category --'}
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
								{categoryOptions
									.filter((cat) => {
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
											aria-selected={
												categoryId === cat.id
											}
											className={`cursor-pointer px-2 py-1.5 text-sm hover:bg-gray-100 ${
												categoryId === cat.id
													? 'bg-emerald-50 text-emerald-800'
													: 'text-gray-700'
											} ${cat.parentCategoryId ? 'pl-4 font-normal' : 'font-semibold'}`}
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

					<div className="flex items-center gap-2">
						<input
							id="sched-notify"
							type="checkbox"
							checked={notifyPayment}
							onChange={(e) =>
								setNotifyPayment(e.target.checked)
							}
							className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
						/>
						<label
							htmlFor="sched-notify"
							className="text-sm text-gray-700"
						>
							Notify about payment
						</label>
						<span className="text-xs text-gray-400">
							(coming soon)
						</span>
					</div>

					<div>
						<label
							htmlFor="sched-notes"
							className="block text-xs font-medium text-gray-700 mb-1"
						>
							Notes
						</label>
						<textarea
							id="sched-notes"
							rows={2}
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							className="block w-full resize-none rounded border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
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
							{isSubmitting ? 'Creating...' : 'Create'}
						</button>
					</div>
				</form>
			</div>
		</div>
	)
}
