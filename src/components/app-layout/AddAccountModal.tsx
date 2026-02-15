import { useState, useCallback, useEffect } from 'react'
import type { AccountType } from '@/types'
import type { Account, CreateAccountInput } from '@/types'
import { createAccount, updateAccount } from '@/api'

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
	{ value: 'cash', label: 'Cash' },
	{ value: 'card', label: 'Card' },
	{ value: 'bank', label: 'Bank' },
	{ value: 'investment', label: 'Investment' },
	{ value: 'loan', label: 'Loan' },
	{ value: 'crypto', label: 'Crypto' },
	{ value: 'other', label: 'Other' },
]

const FIAT_CURRENCIES: { value: string; label: string }[] = [
	{ value: 'USD', label: '$ (USD)' },
	{ value: 'EUR', label: '€ (EUR)' },
	{ value: 'GBP', label: '£ (GBP)' },
	{ value: 'THB', label: '฿ (THB)' },
	{ value: 'RUB', label: '₽ (RUB)' },
]

const CRYPTO_CURRENCIES: { value: string; label: string }[] = [
	{ value: 'USDT', label: 'USDT' },
	{ value: 'USDC', label: 'USDC' },
]

const DEFAULT_USER_ID = '1'

interface AddAccountModalProps {
	isOpen: boolean
	onClose: () => void
	onSuccess: () => void
}

export function AddAccountModal({
	isOpen,
	onClose,
	onSuccess,
}: AddAccountModalProps) {
	const [accountType, setAccountType] = useState<AccountType>('cash')
	const [name, setName] = useState('')
	const [description, setDescription] = useState('')
	const [initialBalance, setInitialBalance] = useState(0)
	const [currencyCode, setCurrencyCode] = useState('USD')
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const currencyOptions =
		accountType === 'crypto' ? CRYPTO_CURRENCIES : FIAT_CURRENCIES

	function handleAccountTypeChange(newType: AccountType) {
		setAccountType(newType)
		if (newType === 'crypto') {
			setCurrencyCode('USDT')
		} else if (currencyCode === 'USDT' || currencyCode === 'USDC') {
			setCurrencyCode('USD')
		}
	}

	const resetForm = useCallback(() => {
		setAccountType('cash')
		setName('')
		setDescription('')
		setInitialBalance(0)
		setCurrencyCode('USD')
		setError(null)
	}, [])

	const handleClose = useCallback(() => {
		resetForm()
		onClose()
	}, [onClose, resetForm])

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		const trimmedName = name.trim()
		if (!trimmedName) {
			setError('Name is required')
			return
		}
		setError(null)
		setIsSubmitting(true)
		const payload: CreateAccountInput = {
			accountType,
			name: trimmedName,
			description: description.trim() || null,
			currencyCode,
			initialBalance: Number(initialBalance) || 0,
			isActive: true,
		}
		createAccount(payload, { userId: DEFAULT_USER_ID })
			.then(() => {
				handleClose()
				onSuccess()
			})
			.catch((err: Error) => {
				setError(err.message || 'Failed to create account')
			})
			.finally(() => setIsSubmitting(false))
	}

	if (!isOpen) {
		return null
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			<div
				className="absolute inset-0 bg-black/40"
				onClick={handleClose}
				aria-hidden="true"
			/>
			<div className="relative z-10 w-full max-w-md bg-white border border-gray-200 rounded-md shadow-xl mx-4">
				<header className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
					<h2 className="text-sm font-semibold tracking-wide text-gray-900 uppercase">
						New account
					</h2>
					<button
						type="button"
						onClick={handleClose}
						className="inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700"
						aria-label="Close"
					>
						✕
					</button>
				</header>

				<form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
					{error && (
						<p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
							{error}
						</p>
					)}

					<div>
						<label
							htmlFor="account-type"
							className="block text-xs font-medium text-gray-700 mb-1"
						>
							Account type
						</label>
						<select
							id="account-type"
							value={accountType}
							onChange={(e) =>
								handleAccountTypeChange(e.target.value as AccountType)
							}
							className="block w-full rounded border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
						>
							{ACCOUNT_TYPES.map(({ value, label }) => (
								<option key={value} value={value}>
									{label}
								</option>
							))}
						</select>
					</div>

					<div>
						<label
							htmlFor="account-name"
							className="block text-xs font-medium text-gray-700 mb-1"
						>
							Name <span className="text-red-500">*</span>
						</label>
						<input
							id="account-name"
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g. Main wallet"
							className="block w-full rounded border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
							autoFocus
						/>
					</div>

					<div>
						<label
							htmlFor="account-description"
							className="block text-xs font-medium text-gray-700 mb-1"
						>
							Description
						</label>
						<textarea
							id="account-description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Optional"
							rows={2}
							className="block w-full rounded border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
						/>
					</div>

					<div>
						<label
							htmlFor="account-balance"
							className="block text-xs font-medium text-gray-700 mb-1"
						>
							Start balance
						</label>
						<input
							id="account-balance"
							type="number"
							step="any"
							value={initialBalance === 0 ? '' : initialBalance}
							onChange={(e) =>
								setInitialBalance(
									e.target.value === ''
										? 0
										: Number(e.target.value),
								)
							}
							placeholder="0"
							className="block w-full rounded border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
						/>
					</div>

					<div>
						<label
							htmlFor="account-currency"
							className="block text-xs font-medium text-gray-700 mb-1"
						>
							Currency
						</label>
						<select
							id="account-currency"
							value={
								currencyOptions.some((c) => c.value === currencyCode)
									? currencyCode
									: currencyOptions[0]?.value ?? 'USD'
							}
							onChange={(e) => setCurrencyCode(e.target.value)}
							className="block w-full rounded border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
						>
							{currencyOptions.map(({ value, label }) => (
								<option key={value} value={value}>
									{label}
								</option>
							))}
						</select>
					</div>

					<div className="flex gap-2 pt-2">
						<button
							type="button"
							onClick={handleClose}
							className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isSubmitting}
							className="flex-1 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none"
						>
							{isSubmitting ? 'Creating…' : 'Create account'}
						</button>
					</div>
				</form>
			</div>
		</div>
	)
}

interface EditAccountModalProps {
	isOpen: boolean
	onClose: () => void
	onSuccess: () => void
	account: Account | null
}

export function EditAccountModal({
	isOpen,
	onClose,
	onSuccess,
	account,
}: EditAccountModalProps) {
	const [accountType, setAccountType] = useState<AccountType>('cash')
	const [name, setName] = useState('')
	const [description, setDescription] = useState('')
	const [currencyCode, setCurrencyCode] = useState('USD')
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const currencyOptions =
		accountType === 'crypto' ? CRYPTO_CURRENCIES : FIAT_CURRENCIES

	useEffect(() => {
		if (account) {
			setAccountType(account.accountType)
			setName(account.name)
			setDescription(account.description ?? '')
			setCurrencyCode(account.currencyCode)
			setError(null)
		}
	}, [account])

	function handleAccountTypeChange(newType: AccountType) {
		setAccountType(newType)
		if (newType === 'crypto') {
			setCurrencyCode('USDT')
		} else if (currencyCode === 'USDT' || currencyCode === 'USDC') {
			setCurrencyCode('USD')
		}
	}

	const handleClose = useCallback(() => {
		setError(null)
		onClose()
	}, [onClose])

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (!account) return
		const trimmedName = name.trim()
		if (!trimmedName) {
			setError('Name is required')
			return
		}
		setError(null)
		setIsSubmitting(true)
		updateAccount(
			account.id,
			{
				accountType,
				name: trimmedName,
				description: description.trim() || null,
				currencyCode,
			},
			{ userId: DEFAULT_USER_ID },
		)
			.then(() => {
				handleClose()
				onSuccess()
			})
			.catch((err: Error) => {
				setError(err.message || 'Failed to update account')
			})
			.finally(() => setIsSubmitting(false))
	}

	if (!isOpen || !account) return null

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			<div
				className="absolute inset-0 bg-black/40"
				onClick={handleClose}
				aria-hidden="true"
			/>
			<div className="relative z-10 w-full max-w-md bg-white border border-gray-200 rounded-md shadow-xl mx-4">
				<header className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
					<h2 className="text-sm font-semibold tracking-wide text-gray-900 uppercase">
						Edit account
					</h2>
					<button
						type="button"
						onClick={handleClose}
						className="inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700"
						aria-label="Close"
					>
						✕
					</button>
				</header>

				<form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
					{error && (
						<p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
							{error}
						</p>
					)}

					<div>
						<label
							htmlFor="edit-account-type"
							className="block text-xs font-medium text-gray-700 mb-1"
						>
							Account type
						</label>
						<select
							id="edit-account-type"
							value={accountType}
							onChange={(e) =>
								handleAccountTypeChange(e.target.value as AccountType)
							}
							className="block w-full rounded border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
						>
							{ACCOUNT_TYPES.map(({ value, label }) => (
								<option key={value} value={value}>
									{label}
								</option>
							))}
						</select>
					</div>

					<div>
						<label
							htmlFor="edit-account-name"
							className="block text-xs font-medium text-gray-700 mb-1"
						>
							Name <span className="text-red-500">*</span>
						</label>
						<input
							id="edit-account-name"
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g. Main wallet"
							className="block w-full rounded border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
							autoFocus
						/>
					</div>

					<div>
						<label
							htmlFor="edit-account-description"
							className="block text-xs font-medium text-gray-700 mb-1"
						>
							Description
						</label>
						<textarea
							id="edit-account-description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Optional"
							rows={2}
							className="block w-full rounded border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
						/>
					</div>

					<div>
						<label
							htmlFor="edit-account-currency"
							className="block text-xs font-medium text-gray-700 mb-1"
						>
							Currency
						</label>
						<select
							id="edit-account-currency"
							value={
								currencyOptions.some((c) => c.value === currencyCode)
									? currencyCode
									: currencyOptions[0]?.value ?? 'USD'
							}
							onChange={(e) => setCurrencyCode(e.target.value)}
							className="block w-full rounded border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
						>
							{currencyOptions.map(({ value, label }) => (
								<option key={value} value={value}>
									{label}
								</option>
							))}
						</select>
					</div>

					<div className="flex gap-2 pt-2">
						<button
							type="button"
							onClick={handleClose}
							className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isSubmitting}
							className="flex-1 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none"
						>
							{isSubmitting ? 'Saving…' : 'Save'}
						</button>
					</div>
				</form>
			</div>
		</div>
	)
}
