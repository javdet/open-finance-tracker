import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { Operation, Category, ScheduledTransaction } from '@/types'
import { DEBT_ACCOUNT_TYPES } from '@/types'
import {
	fetchOperations,
	fetchAccounts,
	fetchCategories,
	fetchCategoryUsage,
	fetchScheduledTransactions,
	deleteOperation,
	updateOperation,
} from '@/api'
import { clsx } from '@/lib/clsx'
import { TransactionTypeSelector } from '@/components/transaction-type-selector/transaction-type-selector'
import { useAuth } from '@/contexts/auth-context'

type DateRangeDays = 1 | 7 | 31 | 'custom'

type SortOrder = 'asc' | 'desc' | null
type SortColumn = 'date' | 'account' | 'category' | null

function cycleSortOrder(current: SortOrder): SortOrder {
	if (current === null) return 'asc'
	if (current === 'asc') return 'desc'
	return null
}

function formatDate(iso: string) {
	const d = new Date(iso)
	const day = d.getDate().toString().padStart(2, '0')
	const month = (d.getMonth() + 1).toString().padStart(2, '0')
	return `${day}.${month}`
}

function formatAmount(
	amount: number,
	_operationType: Operation['operationType'],
	currencyCode: string,
) {
	const signed = amount
	const abs = Math.abs(signed)
	const formatted = Intl.NumberFormat('en-US', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	}).format(abs)
	const currencySuffix = currencyCode ? ` ${currencyCode}` : ''
	return `${signed < 0 ? '-' : '+'}${formatted}${currencySuffix}`
}

function PencilIcon() {
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
				d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
			/>
		</svg>
	)
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

/** Build ordered list for dropdown: top-level first, then their children, then by group. */
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

interface EditOperationModalProps {
	isOpen: boolean
	onClose: () => void
	onSuccess: () => void
	operation: Operation | null
	accounts: Array<{ id: string; name: string; currencyCode: string }>
}

function EditOperationModal({
	isOpen,
	onClose,
	onSuccess,
	operation,
	accounts,
}: EditOperationModalProps) {
	const { user } = useAuth()
	const [transactionType, setTransactionType] = useState<
		'expense' | 'income' | 'transfer'
	>('expense')
	const [categoryId, setCategoryId] = useState<string>('')
	const [categories, setCategories] = useState<Category[]>([])
	const [popularCategoryIds, setPopularCategoryIds] = useState<string[]>([])
	const [isCategoryOpen, setIsCategoryOpen] = useState(false)
	const [categorySearch, setCategorySearch] = useState('')
	const categoryDropdownRef = useRef<HTMLDivElement>(null)
	const [amount, setAmount] = useState('')
	const [date, setDate] = useState('')
	const [accountId, setAccountId] = useState('')
	const [transferAccountId, setTransferAccountId] = useState('')
	const [transferAmount, setTransferAmount] = useState('')
	const [notes, setNotes] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [scheduledTransactions, setScheduledTransactions] = useState<ScheduledTransaction[]>([])
	const [selectedScheduledTxId, setSelectedScheduledTxId] = useState('')

	useEffect(() => {
		if (isOpen && operation) {
			fetchCategories()
				.then(setCategories)
				.catch(() => setCategories([]))
			fetchScheduledTransactions(user?.userId ?? '1')
				.then(setScheduledTransactions)
				.catch(() => setScheduledTransactions([]))

			// Convert operation type: payment -> expense
			const uiType: 'expense' | 'income' | 'transfer' =
				operation.operationType === 'payment'
					? 'expense'
					: operation.operationType === 'transfer'
						? 'transfer'
						: 'income'
			setTransactionType(uiType)

			// Set amount (always positive in UI)
			setAmount(Math.abs(operation.amount).toString())

			// Set date from operationTime
			const opDate = new Date(operation.operationTime)
			setDate(
				[
					opDate.getFullYear(),
					(opDate.getMonth() + 1).toString().padStart(2, '0'),
					opDate.getDate().toString().padStart(2, '0'),
				].join('-'),
			)

			setAccountId(operation.accountId)
			setTransferAccountId(operation.transferAccountId || '')
			setTransferAmount(
				operation.transferAmount != null
					? operation.transferAmount.toString()
					: '',
			)
			setCategoryId(operation.categoryId || '')
			setNotes(operation.notes || '')
			setSelectedScheduledTxId('')
			setError(null)
		}
	}, [isOpen, operation])

	useEffect(() => {
		if (!isOpen || !operation) return
		if (transactionType === 'expense') {
			fetchCategoryUsage(user?.userId ?? '1', 'payment')
				.then((res) => setPopularCategoryIds(res.categoryIds))
				.catch(() => setPopularCategoryIds([]))
		} else if (transactionType === 'income') {
			fetchCategoryUsage(user?.userId ?? '1', 'income')
				.then((res) => setPopularCategoryIds(res.categoryIds))
				.catch(() => setPopularCategoryIds([]))
		} else {
			setPopularCategoryIds([])
		}
	}, [isOpen, operation, transactionType, user?.userId])

	useEffect(() => {
		if (transactionType === 'transfer') {
			setCategoryId('')
		}
		setCategorySearch('')
		setIsCategoryOpen(false)
		setSelectedScheduledTxId('')
	}, [transactionType])

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

	const selectedAccount = accounts.find((a) => a.id === accountId)
	const currencyCode = selectedAccount?.currencyCode ?? 'USD'
	const transferAccount = accounts.find((a) => a.id === transferAccountId)
	const isCrossCurrency =
		transactionType === 'transfer' &&
		!!transferAccount &&
		transferAccount.currencyCode !== currencyCode

	const handleClose = useCallback(() => {
		setError(null)
		onClose()
	}, [onClose])

	const handleSubmit = useCallback(async () => {
		if (!operation) return
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
		const operationTime = `${date}T12:00:00.000Z`

		const parsedTransferAmount = isCrossCurrency
			? parseAmount(transferAmount)
			: null
		if (isCrossCurrency && (parsedTransferAmount === null || parsedTransferAmount <= 0)) {
			setError('Please enter the received amount in the destination currency.')
			return
		}

		setIsSubmitting(true)
		try {
			const operationType =
				transactionType === 'expense'
					? 'payment'
					: transactionType === 'income'
						? 'income'
						: 'transfer'
			await updateOperation(
				operation.id,
				{
					operationType: operationType as 'payment' | 'income' | 'transfer',
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
					transferAmount: parsedTransferAmount ?? null,
					currencyCode,
					notes: notes.trim() || null,
				},
			)
			handleClose()
			onSuccess()
			window.dispatchEvent(new CustomEvent('operation-created'))
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: 'Failed to update transaction. Please try again.',
			)
		} finally {
			setIsSubmitting(false)
		}
	}, [
		operation,
		amount,
		date,
		accountId,
		transferAccountId,
		transferAmount,
		isCrossCurrency,
		transactionType,
		categoryId,
		notes,
		currencyCode,
		handleClose,
		onSuccess,
	])

	const baseOrdered =
		transactionType === 'expense'
			? orderedCategoriesForType(categories, 'expense')
			: transactionType === 'income'
				? orderedCategoriesForType(categories, 'income')
				: []

	const popularFirst = popularCategoryIds
		.map((id) => baseOrdered.find((c) => c.id === id))
		.filter((c): c is Category => c != null)
	const rest = baseOrdered.filter((c) => !popularCategoryIds.includes(c.id))
	const categoryOptions = [...popularFirst, ...rest]

	const filteredScheduledTx = useMemo(() => {
		if (transactionType === 'transfer') return []
		const apiType = transactionType === 'expense' ? 'payment' : 'income'
		return scheduledTransactions.filter((st) => st.operationType === apiType)
	}, [scheduledTransactions, transactionType])

	const handleScheduledTxChange = useCallback(
		(txId: string) => {
			setSelectedScheduledTxId(txId)
			if (!txId) return
			const tx = scheduledTransactions.find((st) => st.id === txId)
			if (!tx) return
			setAmount(Math.abs(tx.amount).toString())
			setCategoryId(tx.categoryId ?? '')
		},
		[scheduledTransactions],
	)

	const showCategory = transactionType === 'expense' || transactionType === 'income'

	if (!isOpen || !operation) {
		return null
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			<div
				className="absolute inset-0 bg-black/40"
				onClick={handleClose}
				aria-hidden="true"
			/>
			<div className="relative z-10 w-full max-w-3xl bg-surface-card border rounded-md shadow-xl">
				<header className="flex items-center justify-between px-6 py-3 border-b">
					<h2 className="text-sm font-semibold tracking-wide text-primary uppercase">
						Edit Transaction
					</h2>
					<button
						type="button"
						onClick={handleClose}
						className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-surface-hover hover:text-secondary"
						aria-label="Close edit transaction window"
					>
						✕
					</button>
				</header>

				<div className="px-6 py-4 space-y-4">
					{error && (
						<div
							className="rounded border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 px-3 py-2 text-sm text-red-700 dark:text-red-300"
							role="alert"
						>
							{error}
						</div>
					)}
					<div className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4 items-start">
						<div>
							<label className="block text-xs font-medium text-secondary mb-1">
								Amount:
							</label>
							<input
								type="text"
								value={amount}
								onChange={(e) => setAmount(e.target.value)}
								className="block w-full rounded border border-strong bg-surface-card text-primary px-2 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
								placeholder="e.g. 100 or 12 + 33"
							/>
							<p className="mt-1 text-[11px] text-muted">
								Example: 12 + 33 + 45
							</p>
						</div>
						<div>
							<label className="block text-xs font-medium text-secondary mb-1">
								Date:
							</label>
							<input
								type="date"
								value={date}
								onChange={(e) => setDate(e.target.value)}
								className="block w-full rounded border border-strong bg-surface-card text-primary px-2 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
							/>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4">
						<div>
							<label className="block text-xs font-medium text-secondary mb-1">
								Account:
							</label>
							<select
								value={accountId}
								onChange={(e) => setAccountId(e.target.value)}
								className="block w-full rounded border border-strong bg-surface-card text-primary px-2 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
							>
								{accounts.map((account) => (
									<option key={account.id} value={account.id}>
										{account.name} ({account.currencyCode})
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="block text-xs font-medium text-secondary mb-1">
								Transaction Type:
							</label>
							<TransactionTypeSelector
								value={transactionType}
								onChange={setTransactionType}
							/>
						</div>
						{transactionType !== 'transfer' && (
							<div>
								<label className="block text-xs font-medium text-secondary mb-1">
									Scheduled:
								</label>
								<select
									value={selectedScheduledTxId}
									onChange={(e) => handleScheduledTxChange(e.target.value)}
									className="block w-full rounded border border-strong bg-surface-card text-primary px-2 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
								>
									<option value="">— None —</option>
									{filteredScheduledTx.map((st) => (
										<option key={st.id} value={st.id}>
											{st.name}
										</option>
									))}
								</select>
							</div>
						)}
					</div>

					{showCategory && (
						<div ref={categoryDropdownRef} className="relative">
							<label className="block text-xs font-medium text-secondary mb-1">
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
								className="block w-full rounded border border-strong bg-surface-card text-primary px-2 py-1 text-sm shadow-sm text-left focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 flex items-center justify-between gap-2"
								aria-haspopup="listbox"
								aria-expanded={isCategoryOpen}
								aria-label="Select category"
							>
								<span className="truncate">
									{categoryId
										? categoryOptions.find((c) => c.id === categoryId)?.name ??
											''
										: 'Category'}
								</span>
								<span
									className={`shrink-0 text-faint transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`}
									aria-hidden
								>
									▾
								</span>
							</button>
							{isCategoryOpen && (
								<ul
									role="listbox"
									className="absolute z-20 mt-1 w-full max-h-60 overflow-auto rounded border bg-surface-card py-1 shadow-lg"
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
											className="w-full rounded border border-strong bg-surface-card text-primary px-2 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
										/>
									</li>
								{(() => {
									const filtered = categoryOptions.filter((cat) => {
										if (!categorySearch.trim()) return true
										return cat.name
											.toLowerCase()
											.includes(categorySearch.toLowerCase())
									})
									const popularFiltered = filtered.filter((c) =>
										popularCategoryIds.includes(c.id),
									)
									const otherFiltered = filtered.filter(
										(c) => !popularCategoryIds.includes(c.id),
									)
									const showSections =
										!categorySearch.trim() &&
										popularFiltered.length > 0
									return (
										<>
											{showSections && (
												<li className="px-2 pt-1.5 pb-0.5 text-xs font-semibold text-muted">
													Frequently used categories
												</li>
											)}
											{showSections
												? popularFiltered.map((cat) => (
														<li
															key={cat.id}
															role="option"
															aria-selected={categoryId === cat.id}
															className={`cursor-pointer px-2 py-1.5 text-sm hover:bg-surface-hover ${categoryId === cat.id ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' : 'text-secondary'} ${cat.parentCategoryId ? 'pl-4 font-normal' : 'font-semibold'}`}
															onClick={() => {
																setCategoryId(cat.id)
																setIsCategoryOpen(false)
																setCategorySearch('')
															}}
														>
															{cat.name}
														</li>
													))
												: null}
											{showSections && otherFiltered.length > 0 && (
												<li className="px-2 pt-2 pb-0.5 text-xs font-semibold text-muted">
													Other categories
												</li>
											)}
											{(showSections ? otherFiltered : filtered).map(
												(cat) => (
													<li
														key={cat.id}
														role="option"
														aria-selected={categoryId === cat.id}
														className={`cursor-pointer px-2 py-1.5 text-sm hover:bg-surface-hover ${categoryId === cat.id ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' : 'text-secondary'} ${cat.parentCategoryId ? 'pl-4 font-normal' : 'font-semibold'}`}
														onClick={() => {
															setCategoryId(cat.id)
															setIsCategoryOpen(false)
															setCategorySearch('')
														}}
													>
														{cat.name}
													</li>
												),
											)}
										</>
									)
								})()}
								</ul>
							)}
						</div>
					)}

					{transactionType === 'transfer' && (
						<div>
							<label className="block text-xs font-medium text-secondary mb-1">
								Transfer to account:
							</label>
							<select
								value={transferAccountId}
								onChange={(e) => setTransferAccountId(e.target.value)}
								className="block w-full rounded border border-strong bg-surface-card text-primary px-2 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
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

					{isCrossCurrency && transferAccount && (
						<div>
							<label className="block text-xs font-medium text-secondary mb-1">
								Received amount ({transferAccount.currencyCode}):
							</label>
							<input
								type="text"
								value={transferAmount}
								onChange={(e) => setTransferAmount(e.target.value)}
								className="block w-full rounded border border-strong bg-surface-card text-primary px-2 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
								placeholder={`Amount in ${transferAccount.currencyCode}`}
							/>
							<p className="mt-1 text-[11px] text-muted">
								Amount credited to {transferAccount.name} in {transferAccount.currencyCode}
							</p>
						</div>
					)}

					<div>
						<label className="block text-xs font-medium text-secondary mb-1">
							Comments:
						</label>
						<textarea
							rows={3}
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							className="block w-full resize-none rounded border border-strong bg-surface-card text-primary px-2 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
						/>
					</div>
				</div>

				<footer className="flex items-center justify-between px-6 py-3 border-t">
					<p className="text-[11px] text-muted">
						Confirm changes with Ctrl+Enter
					</p>
					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={handleClose}
							className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-strong text-secondary hover:bg-surface-hover"
							aria-label="Cancel transaction edit"
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

interface ExportCsvModalProps {
	isOpen: boolean
	onClose: () => void
}

function ExportCsvModal({ isOpen, onClose }: ExportCsvModalProps) {
	const [allTime, setAllTime] = useState(true)
	const [fromDate, setFromDate] = useState('')
	const [toDate, setToDate] = useState('')

	useEffect(() => {
		if (isOpen) {
			setAllTime(true)
			setFromDate('')
			setToDate('')
		}
	}, [isOpen])

	const handleExport = useCallback(() => {
		const params = new URLSearchParams()
		if (!allTime && fromDate) {
			params.set(
				'fromTime',
				new Date(`${fromDate}T00:00:00`).toISOString(),
			)
		}
		if (!allTime && toDate) {
			params.set(
				'toTime',
				new Date(`${toDate}T23:59:59.999`).toISOString(),
			)
		}
		const query = params.toString()
		const url = `/api/operations/export${query ? `?${query}` : ''}`
		const a = document.createElement('a')
		a.href = url
		a.download = 'transactions-export.csv'
		document.body.appendChild(a)
		a.click()
		document.body.removeChild(a)
		onClose()
	}, [allTime, fromDate, toDate, onClose])

	if (!isOpen) return null

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			<div
				className="absolute inset-0 bg-black/40"
				onClick={onClose}
				aria-hidden="true"
			/>
			<div className="relative z-10 w-full max-w-md bg-surface-card border rounded-md shadow-xl">
				<header className="flex items-center justify-between px-6 py-3 border-b">
					<h2 className="text-sm font-semibold tracking-wide text-primary uppercase">
						Export Transactions to CSV
					</h2>
					<button
						type="button"
						onClick={onClose}
						className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-surface-hover hover:text-secondary"
						aria-label="Close export modal"
					>
						✕
					</button>
				</header>

				<div className="px-6 py-4 space-y-4">
					<label className="flex items-center gap-2 cursor-pointer">
						<input
							type="checkbox"
							checked={allTime}
							onChange={(e) => setAllTime(e.target.checked)}
							className="h-4 w-4 rounded border-strong text-emerald-600 focus:ring-emerald-500"
						/>
						<span className="text-sm text-secondary">All time</span>
					</label>

					{!allTime && (
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="block text-xs font-medium text-secondary mb-1">
									From
								</label>
								<input
									type="date"
									value={fromDate}
									onChange={(e) => setFromDate(e.target.value)}
									className="block w-full rounded border border-strong bg-surface-card text-primary px-2 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
								/>
							</div>
							<div>
								<label className="block text-xs font-medium text-secondary mb-1">
									To
								</label>
								<input
									type="date"
									value={toDate}
									onChange={(e) => setToDate(e.target.value)}
									className="block w-full rounded border border-strong bg-surface-card text-primary px-2 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
								/>
							</div>
						</div>
					)}
				</div>

				<footer className="flex items-center justify-end gap-3 px-6 py-3 border-t">
					<button
						type="button"
						onClick={onClose}
						className="rounded px-4 py-1.5 text-sm font-medium text-secondary border border-strong hover:bg-surface-hover transition-colors"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={handleExport}
						disabled={!allTime && (!fromDate || !toDate)}
						className="rounded px-4 py-1.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:pointer-events-none"
					>
						Export
					</button>
				</footer>
			</div>
		</div>
	)
}

export function TransactionsPage() {
	const [operations, setOperations] = useState<Operation[]>([])
	const [total, setTotal] = useState(0)
	const [error, setError] = useState<string | null>(null)
	const [dateRangeDays, setDateRangeDays] = useState<DateRangeDays>(7)
	const [accountMap, setAccountMap] = useState<Record<string, string>>({})
	const [categoryMap, setCategoryMap] = useState<Record<string, string>>({})
	const [selectedTransactionId, setSelectedTransactionId] = useState<
		string | null
	>(null)
	const [editingOperation, setEditingOperation] = useState<Operation | null>(
		null,
	)
	const [accounts, setAccounts] = useState<
		Array<{ id: string; name: string; currencyCode: string }>
	>([])
	const [customFrom, setCustomFrom] = useState('')
	const [customTo, setCustomTo] = useState('')
	const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
	const [isExportModalOpen, setIsExportModalOpen] = useState(false)
	const datePickerRef = useRef<HTMLDivElement>(null)
	const [sortBy, setSortBy] = useState<SortColumn>('date')
	const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

	const loadOperations = useCallback(() => {
		let fromTime: string
		let toTime: string

		if (dateRangeDays === 'custom') {
			if (!customFrom || !customTo) return
			fromTime = new Date(`${customFrom}T00:00:00`).toISOString()
			toTime = new Date(`${customTo}T23:59:59.999`).toISOString()
		} else {
			const now = new Date()
			const endOfToday = new Date(
				now.getFullYear(),
				now.getMonth(),
				now.getDate(),
				23,
				59,
				59,
				999,
			)
			toTime = endOfToday.toISOString()
			fromTime = new Date(
				endOfToday.getTime() - dateRangeDays * 24 * 60 * 60 * 1000,
			).toISOString()
		}

		fetchOperations({
			fromTime,
			toTime,
			limit: 100,
		})
			.then((res) => {
				setOperations(res.rows)
				setTotal(res.total)
			})
			.catch((err: Error) => setError(err.message))
	}, [dateRangeDays, customFrom, customTo])

	useEffect(() => {
		fetchAccounts()
			.then((accountsList) => {
				const map: Record<string, string> = {}
				accountsList.forEach((a) => {
					map[a.id] = a.name
				})
				setAccountMap(map)
				setAccounts(
					accountsList
						.filter((a) => !DEBT_ACCOUNT_TYPES.has(a.accountType))
						.map((a) => ({
							id: a.id,
							name: a.name,
							currencyCode: a.currencyCode,
						})),
				)
			})
			.catch(() => {})
	}, [])

	useEffect(() => {
		fetchCategories()
			.then((categories) => {
				const map: Record<string, string> = {}
				categories.forEach((c) => {
					map[c.id] = c.name
				})
				setCategoryMap(map)
			})
			.catch(() => {})
	}, [])

	useEffect(() => {
		loadOperations()
	}, [loadOperations])

	useEffect(() => {
		const handler = () => loadOperations()
		window.addEventListener('operation-created', handler)
		return () => window.removeEventListener('operation-created', handler)
	}, [loadOperations])

	useEffect(() => {
		if (!isDatePickerOpen) return
		function handleClickOutside(event: MouseEvent) {
			if (
				datePickerRef.current &&
				!datePickerRef.current.contains(event.target as Node)
			) {
				setIsDatePickerOpen(false)
			}
		}
		document.addEventListener('mousedown', handleClickOutside)
		return () => document.removeEventListener('mousedown', handleClickOutside)
	}, [isDatePickerOpen])

	const sortedOperations = useMemo(() => {
		if (!sortBy || !sortOrder) {
			return operations
		}
		const order = sortOrder === 'asc' ? 1 : -1
		return [...operations].sort((a, b) => {
			if (sortBy === 'date') {
				const aTime = new Date(a.operationTime).getTime()
				const bTime = new Date(b.operationTime).getTime()
				return order * (aTime - bTime)
			}
			if (sortBy === 'account') {
				const aName = accountMap[a.accountId] ?? ''
				const bName = accountMap[b.accountId] ?? ''
				return order * aName.localeCompare(bName)
			}
			if (sortBy === 'category') {
				const aCatId = a.categoryId
				const bCatId = b.categoryId
				const aName = aCatId ? categoryMap[aCatId] ?? '' : ''
				const bName = bCatId ? categoryMap[bCatId] ?? '' : ''
				return order * aName.localeCompare(bName)
			}
			return 0
		})
	}, [operations, sortBy, sortOrder, accountMap, categoryMap])

	const handleSortHeaderClick = useCallback((column: Exclude<SortColumn, null>) => {
		setSortBy((prevBy) => {
			if (prevBy !== column) {
				setSortOrder('asc')
				return column
			}
			setSortOrder((prevOrder) => cycleSortOrder(prevOrder))
			return prevBy
		})
	}, [])

	const handleDelete = useCallback(
		async (operationId: string) => {
			if (!confirm('Are you sure you want to delete this transaction?')) {
				return
			}
			try {
				await deleteOperation(operationId)
				loadOperations()
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to delete transaction')
			}
		},
		[loadOperations],
	)

	const handleEdit = useCallback((operation: Operation) => {
		setEditingOperation(operation)
	}, [])

	const handleEditSuccess = useCallback(() => {
		loadOperations()
		setEditingOperation(null)
	}, [loadOperations])

	return (
		<div className="flex flex-col h-full">
			<div className="mb-4 flex flex-wrap items-center justify-between gap-2">
				<h2 className="text-lg font-semibold text-primary">
					Transactions
				</h2>
			<div className="flex items-center gap-1">
				{([1, 7, 31] as const).map((days) => (
					<button
						key={days}
						type="button"
						onClick={() => {
							setCustomFrom('')
							setCustomTo('')
							setDateRangeDays(days)
							setIsDatePickerOpen(false)
						}}
						className={`rounded px-2.5 py-1 text-sm font-medium transition-colors ${
							dateRangeDays === days
								? 'bg-emerald-600 text-white'
								: 'bg-surface-hover text-secondary hover:bg-surface-hover'
						}`}
					>
						{days}d
					</button>
				))}
				<div ref={datePickerRef} className="relative">
					<button
						type="button"
						onClick={() => setIsDatePickerOpen((prev) => !prev)}
						className={`rounded px-2 py-1 text-sm font-medium transition-colors ${
							dateRangeDays === 'custom'
								? 'bg-emerald-600 text-white'
								: 'bg-surface-hover text-secondary hover:bg-surface-hover'
						}`}
						aria-label="Custom date range"
						aria-expanded={isDatePickerOpen}
					>
						<svg
							className="w-4 h-4"
							fill="none"
							stroke="currentColor"
							strokeWidth={1.5}
							viewBox="0 0 24 24"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z"
							/>
						</svg>
					</button>
					{isDatePickerOpen && (
						<div className="absolute right-0 top-full mt-2 z-30 w-64 rounded-md border bg-surface-card p-3 shadow-lg">
							<div className="space-y-2">
								<div>
									<label className="block text-xs font-medium text-secondary mb-1">
										From
									</label>
									<input
										type="date"
										value={customFrom}
										onChange={(e) => setCustomFrom(e.target.value)}
										className="block w-full rounded border border-strong bg-surface-card text-primary px-2 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
									/>
								</div>
								<div>
									<label className="block text-xs font-medium text-secondary mb-1">
										To
									</label>
									<input
										type="date"
										value={customTo}
										onChange={(e) => setCustomTo(e.target.value)}
										className="block w-full rounded border border-strong bg-surface-card text-primary px-2 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
									/>
								</div>
								<button
									type="button"
									disabled={!customFrom || !customTo}
									onClick={() => {
										setDateRangeDays('custom')
										setIsDatePickerOpen(false)
									}}
									className="w-full rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none"
								>
									Apply
								</button>
							</div>
						</div>
					)}
				</div>
				<button
					type="button"
					onClick={() => setIsExportModalOpen(true)}
					className="rounded px-2 py-1 text-sm font-medium transition-colors bg-surface-hover text-secondary hover:bg-surface-hover"
					aria-label="Export transactions to CSV"
					title="Export to CSV"
				>
					<svg
						className="w-4 h-4"
						fill="none"
						stroke="currentColor"
						strokeWidth={1.5}
						viewBox="0 0 24 24"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
						/>
					</svg>
				</button>
			</div>
			</div>
			{error && (
				<p className="mb-2 text-sm text-warning">{error}</p>
			)}
			<div className="flex-1 overflow-hidden rounded-md border bg-surface-card">
				<div className="max-h-[calc(100vh-220px)] overflow-auto">
					<table className="min-w-full border-collapse text-xs md:text-sm">
						<thead className="bg-surface sticky top-0 z-10">
							<tr className="text-left text-secondary">
								<th className="border-b px-2 py-2">
									<button
										type="button"
										onClick={() => handleSortHeaderClick('date')}
										className={clsx(
											'flex items-center gap-1 font-medium outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 rounded',
											sortBy === 'date' && sortOrder != null && 'text-emerald-700',
										)}
										title={
											sortBy !== 'date' || sortOrder === null
												? 'Click to sort by date'
												: `Sorted by date (${sortOrder === 'asc' ? 'oldest first' : 'newest first'}). Click to change.`
										}
									>
										Date
										{sortBy === 'date' && sortOrder === 'asc' && (
											<span className="text-emerald-600" aria-hidden>↑</span>
										)}
										{sortBy === 'date' && sortOrder === 'desc' && (
											<span className="text-emerald-600" aria-hidden>↓</span>
										)}
									</button>
								</th>
								<th className="border-b px-2 py-2 text-right">
									Amount
								</th>
								<th className="border-b px-2 py-2">
									<button
										type="button"
										onClick={() => handleSortHeaderClick('account')}
										className={clsx(
											'flex items-center gap-1 font-medium outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 rounded',
											sortBy === 'account' && sortOrder != null && 'text-emerald-700',
										)}
										title={
											sortBy !== 'account' || sortOrder === null
												? 'Click to sort by account'
												: `Sorted by account (${sortOrder === 'asc' ? 'A → Z' : 'Z → A'}). Click to change.`
										}
									>
										Account
										{sortBy === 'account' && sortOrder === 'asc' && (
											<span className="text-emerald-600" aria-hidden>↑</span>
										)}
										{sortBy === 'account' && sortOrder === 'desc' && (
											<span className="text-emerald-600" aria-hidden>↓</span>
										)}
									</button>
								</th>
								<th className="border-b px-2 py-2">
									<button
										type="button"
										onClick={() => handleSortHeaderClick('category')}
										className={clsx(
											'flex items-center gap-1 font-medium outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 rounded',
											sortBy === 'category' && sortOrder != null && 'text-emerald-700',
										)}
										title={
											sortBy !== 'category' || sortOrder === null
												? 'Click to sort by category'
												: `Sorted by category (${sortOrder === 'asc' ? 'A → Z' : 'Z → A'}). Click to change.`
										}
									>
										Category
										{sortBy === 'category' && sortOrder === 'asc' && (
											<span className="text-emerald-600" aria-hidden>↑</span>
										)}
										{sortBy === 'category' && sortOrder === 'desc' && (
											<span className="text-emerald-600" aria-hidden>↓</span>
										)}
									</button>
								</th>
								<th className="border-b px-2 py-2">
									Tags and Comments
								</th>
								<th className="border-b px-2 py-2 w-24">
									{/* Actions */}
								</th>
							</tr>
						</thead>
						<tbody>
							{sortedOperations.map((op, index) => {
								const isSelected = selectedTransactionId === op.id
								return (
									<tr
										key={`${op.id}-${op.operationTime}`}
										className={clsx(
											'group',
											index % 2 === 0
												? 'bg-emerald-50/40 dark:bg-emerald-950/40'
												: 'bg-surface-card',
											isSelected && 'bg-emerald-100',
										)}
										onMouseEnter={() => setSelectedTransactionId(op.id)}
										onMouseLeave={() => setSelectedTransactionId(null)}
									>
								<td className="border-b border-subtle px-2 py-1.5 align-top text-primary">
										{formatDate(op.operationTime)}
									</td>
									<td
										className={`border-b border-subtle px-2 py-1.5 align-top text-right font-medium ${
											op.operationType === 'income'
												? 'text-positive'
												: op.operationType === 'payment'
													? 'text-red-500'
													: 'text-secondary'
										}`}
									>
										{formatAmount(
											op.amount,
											op.operationType,
											op.currencyCode,
										)}
									</td>
									<td className="border-b border-subtle px-2 py-1.5 align-top text-primary">
										{accountMap[op.accountId] ?? op.accountId}
										{op.transferAccountId
											? ` → ${accountMap[op.transferAccountId] ?? op.transferAccountId}`
											: ''}
									</td>
									<td className="border-b border-subtle px-2 py-1.5 align-top text-primary">
										{op.categoryId
											? categoryMap[op.categoryId] ?? '-'
											: '-'}
									</td>
									<td className="border-b border-subtle px-2 py-1.5 align-top text-muted">
										{op.notes ?? ''}
									</td>
									<td className="border-b border-subtle px-2 py-1.5 align-top">
										<div className="flex items-center gap-1">
											<button
												type="button"
												onClick={() => handleEdit(op)}
												className={clsx(
													'inline-flex items-center justify-center w-6 h-6 rounded border border-emerald-600 text-emerald-600 transition-opacity hover:bg-emerald-50',
													isSelected
														? 'opacity-100'
														: 'opacity-0 group-hover:opacity-100',
												)}
												aria-label="Edit Transaction"
											>
												<PencilIcon />
											</button>
											<button
												type="button"
												onClick={() => handleDelete(op.id)}
												className={clsx(
													'inline-flex items-center justify-center w-6 h-6 rounded transition-opacity bg-emerald-600 text-white hover:bg-emerald-700',
													isSelected
														? 'opacity-100'
														: 'opacity-0 group-hover:opacity-100',
												)}
												aria-label="Delete Transaction"
											>
												<TrashIcon />
											</button>
										</div>
									</td>
								</tr>
							)
							})}
						</tbody>
					</table>
				</div>
				{total > 0 && (
					<p className="px-2 py-1.5 text-xs text-muted border-t border-subtle">
						{operations.length} of {total} transactions
					</p>
				)}
			</div>
			<EditOperationModal
				isOpen={editingOperation != null}
				onClose={() => setEditingOperation(null)}
				onSuccess={handleEditSuccess}
				operation={editingOperation}
				accounts={accounts}
			/>
			<ExportCsvModal
				isOpen={isExportModalOpen}
				onClose={() => setIsExportModalOpen(false)}
			/>
		</div>
	)
}
