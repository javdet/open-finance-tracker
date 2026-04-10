import { useState, useCallback, useEffect } from 'react'
import type { AccountType, Category } from '@/types'
import type { Account, CreateAccountInput } from '@/types'
import {
	createAccount,
	updateAccount,
	fetchCategories,
	createWalletWatch,
	updateWalletWatch,
	deleteWalletWatch,
	fetchWalletWatchByAccountId,
	pollWalletWatchNow,
} from '@/api'
import type { Chain, WalletWatch } from '@/api'

const ASSET_ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
	{ value: 'cash', label: 'Cash' },
	{ value: 'card', label: 'Card' },
	{ value: 'bank', label: 'Bank' },
	{ value: 'investment', label: 'Investment' },
	{ value: 'crypto', label: 'Crypto' },
	{ value: 'other', label: 'Other' },
]

const DEBT_ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
	{ value: 'credit_card', label: 'Credit Card' },
	{ value: 'loan', label: 'Loan' },
	{ value: 'mortgage', label: 'Mortgage' },
]

function formatDebtPreview(amount: number, currencyCode: string): string {
	try {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: currencyCode,
			maximumFractionDigits: 0,
		}).format(amount)
	} catch {
		const formatted = new Intl.NumberFormat('en-US', {
			maximumFractionDigits: 0,
		}).format(amount)
		return `${currencyCode} ${formatted}`
	}
}

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

const CHAIN_OPTIONS: { value: Chain; label: string }[] = [
	{ value: 'ethereum', label: 'Ethereum' },
	{ value: 'tron', label: 'Tron' },
	{ value: 'solana', label: 'Solana' },
]

const ADDRESS_PATTERNS: Record<Chain, RegExp> = {
	ethereum: /^0x[a-fA-F0-9]{40}$/,
	tron: /^T[a-zA-Z1-9]{33}$/,
	solana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
}

const ADDRESS_PLACEHOLDERS: Record<Chain, string> = {
	ethereum: '0x1234...abcd',
	tron: 'T1234...abcd',
	solana: 'So11...1111',
}

const POLL_INTERVAL_OPTIONS: { value: number; label: string }[] = [
	{ value: 900_000, label: '15 minutes' },
	{ value: 1_800_000, label: '30 minutes' },
	{ value: 3_600_000, label: '1 hour' },
	{ value: 10_800_000, label: '3 hours' },
	{ value: 21_600_000, label: '6 hours' },
	{ value: 43_200_000, label: '12 hours' },
	{ value: 86_400_000, label: '24 hours' },
]

const DEFAULT_POLL_INTERVAL_MS = 3_600_000

interface TrackingState {
	enabled: boolean
	chain: Chain
	walletAddress: string
	defaultCategoryId: string
	pollIntervalMs: number
}

const EMPTY_TRACKING: TrackingState = {
	enabled: false,
	chain: 'ethereum',
	walletAddress: '',
	defaultCategoryId: '',
	pollIntervalMs: DEFAULT_POLL_INTERVAL_MS,
}

function ChevronIcon({ open }: { open: boolean }) {
	return (
		<svg
			className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
				d="M19 9l-7 7-7-7"
			/>
		</svg>
	)
}

function TrackingFields({
	idPrefix,
	tracking,
	setTracking,
	categories,
	readOnlyChainAddress,
}: {
	idPrefix: string
	tracking: TrackingState
	setTracking: (t: TrackingState) => void
	categories: Category[]
	readOnlyChainAddress?: boolean
}) {
	return (
		<div className="border border-emerald-200 dark:border-emerald-800 rounded-md overflow-hidden">
			<button
				type="button"
				onClick={() =>
					setTracking({ ...tracking, enabled: !tracking.enabled })
				}
				className="w-full flex items-center justify-between px-3 py-2 bg-emerald-50 dark:bg-emerald-950 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors text-left"
			>
				<span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">
					Transaction Tracking
				</span>
				<ChevronIcon open={tracking.enabled} />
			</button>
			{tracking.enabled && (
				<div className="px-3 py-3 space-y-3 bg-surface-card">
					<div>
						<label
							htmlFor={`${idPrefix}-chain`}
							className="block text-xs font-medium text-secondary mb-1"
						>
							Blockchain
						</label>
						<select
							id={`${idPrefix}-chain`}
							value={tracking.chain}
							onChange={(e) =>
								setTracking({
									...tracking,
									chain: e.target.value as Chain,
									walletAddress: '',
								})
							}
							disabled={readOnlyChainAddress}
							className="block w-full rounded border border-strong bg-surface-card px-2 py-1.5 text-sm text-primary shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-surface-hover disabled:text-muted"
						>
							{CHAIN_OPTIONS.map(({ value, label }) => (
								<option key={value} value={value}>
									{label}
								</option>
							))}
						</select>
					</div>
					<div>
						<label
							htmlFor={`${idPrefix}-address`}
							className="block text-xs font-medium text-secondary mb-1"
						>
							Wallet address
						</label>
						<input
							id={`${idPrefix}-address`}
							type="text"
							value={tracking.walletAddress}
							onChange={(e) =>
								setTracking({
									...tracking,
									walletAddress: e.target.value.trim(),
								})
							}
							placeholder={ADDRESS_PLACEHOLDERS[tracking.chain]}
							disabled={readOnlyChainAddress}
							className="block w-full rounded border border-strong bg-surface-card px-2 py-1.5 text-sm text-primary shadow-sm font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-surface-hover disabled:text-muted"
						/>
					</div>
					<div>
						<label
							htmlFor={`${idPrefix}-category`}
							className="block text-xs font-medium text-secondary mb-1"
						>
							Default category
						</label>
						<select
							id={`${idPrefix}-category`}
							value={tracking.defaultCategoryId}
							onChange={(e) =>
								setTracking({
									...tracking,
									defaultCategoryId: e.target.value,
								})
							}
							className="block w-full rounded border border-strong bg-surface-card px-2 py-1.5 text-sm text-primary shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
						>
							<option value="">
								None (auto-detect by direction)
							</option>
							{categories.map((cat) => (
								<option key={cat.id} value={cat.id}>
									{cat.name} ({cat.type})
								</option>
							))}
						</select>
					</div>
					<div>
						<label
							htmlFor={`${idPrefix}-interval`}
							className="block text-xs font-medium text-secondary mb-1"
						>
							Poll interval
						</label>
						<select
							id={`${idPrefix}-interval`}
							value={tracking.pollIntervalMs}
							onChange={(e) =>
								setTracking({
									...tracking,
									pollIntervalMs: Number(e.target.value),
								})
							}
							className="block w-full rounded border border-strong bg-surface-card px-2 py-1.5 text-sm text-primary shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
						>
							{POLL_INTERVAL_OPTIONS.map(({ value, label }) => (
								<option key={value} value={value}>
									{label}
								</option>
							))}
						</select>
					</div>
				</div>
			)}
		</div>
	)
}

interface AddAccountModalProps {
	isOpen: boolean
	onClose: () => void
	onSuccess: () => void
	forDebt?: boolean
}

export function AddAccountModal({
	isOpen,
	onClose,
	onSuccess,
	forDebt = false,
}: AddAccountModalProps) {
	const accountTypeOptions = forDebt
		? DEBT_ACCOUNT_TYPES
		: ASSET_ACCOUNT_TYPES
	const defaultType = accountTypeOptions[0].value
	const [accountType, setAccountType] = useState<AccountType>(defaultType)
	const [name, setName] = useState('')
	const [description, setDescription] = useState('')
	const [initialBalance, setInitialBalance] = useState(0)
	const [currencyCode, setCurrencyCode] = useState('USD')
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [tracking, setTracking] = useState<TrackingState>(EMPTY_TRACKING)
	const [categories, setCategories] = useState<Category[]>([])

	const isCrypto = accountType === 'crypto'
	const currencyOptions = isCrypto ? CRYPTO_CURRENCIES : FIAT_CURRENCIES

	useEffect(() => {
		if (isCrypto && categories.length === 0) {
			fetchCategories().then(setCategories).catch(() => {})
		}
	}, [isCrypto, categories.length])

	function handleAccountTypeChange(newType: AccountType) {
		setAccountType(newType)
		if (newType === 'crypto') {
			setCurrencyCode('USDT')
		} else if (currencyCode === 'USDT' || currencyCode === 'USDC') {
			setCurrencyCode('USD')
		}
		if (newType !== 'crypto') {
			setTracking(EMPTY_TRACKING)
		}
	}

	const resetForm = useCallback(() => {
		setAccountType(defaultType)
		setName('')
		setDescription('')
		setInitialBalance(0)
		setCurrencyCode('USD')
		setError(null)
		setTracking(EMPTY_TRACKING)
	}, [defaultType])

	const handleClose = useCallback(() => {
		resetForm()
		onClose()
	}, [onClose, resetForm])

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		const trimmedName = name.trim()
		if (!trimmedName) {
			setError('Name is required')
			return
		}
		if (tracking.enabled) {
			if (!tracking.walletAddress) {
				setError('Wallet address is required for tracking')
				return
			}
			if (!ADDRESS_PATTERNS[tracking.chain].test(tracking.walletAddress)) {
				setError(
					`Invalid ${CHAIN_OPTIONS.find((c) => c.value === tracking.chain)?.label} address format`,
				)
				return
			}
		}
		setError(null)
		setIsSubmitting(true)
		try {
			const rawBalance = Number(initialBalance) || 0
			const finalBalance = forDebt
				? -Math.abs(rawBalance)
				: rawBalance
			const payload: CreateAccountInput = {
				accountType,
				name: trimmedName,
				description: description.trim() || null,
				currencyCode,
				initialBalance: finalBalance,
				isActive: true,
			}
			const newAccount = await createAccount(payload)
			if (tracking.enabled && newAccount?.id) {
				await createWalletWatch({
					chain: tracking.chain,
					walletAddress: tracking.walletAddress,
					accountId: newAccount.id,
					defaultCategoryId: tracking.defaultCategoryId || null,
					pollIntervalMs: tracking.pollIntervalMs,
				})
			}
			handleClose()
			onSuccess()
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: 'Failed to create account',
			)
		} finally {
			setIsSubmitting(false)
		}
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
			<div className="relative z-10 w-full max-w-md bg-surface-card border rounded-md shadow-xl mx-4 max-h-[90vh] overflow-y-auto">
				<header className="flex items-center justify-between px-6 py-3 border-b">
					<h2 className="text-sm font-semibold tracking-wide text-primary uppercase">
						New account
					</h2>
					<button
						type="button"
						onClick={handleClose}
						className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-surface-hover hover:text-secondary"
						aria-label="Close"
					>
						✕
					</button>
				</header>

				<form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
					{error && (
						<p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 px-3 py-2 rounded">
							{error}
						</p>
					)}

					<div>
						<label
							htmlFor="account-type"
							className="block text-xs font-medium text-secondary mb-1"
						>
							Account type
						</label>
						<select
							id="account-type"
							value={accountType}
							onChange={(e) =>
								handleAccountTypeChange(e.target.value as AccountType)
							}
							className="block w-full rounded border border-strong bg-surface-card px-2 py-1.5 text-sm text-primary shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
						>
							{accountTypeOptions.map(({ value, label }) => (
								<option key={value} value={value}>
									{label}
								</option>
							))}
						</select>
					</div>

					<div>
						<label
							htmlFor="account-name"
							className="block text-xs font-medium text-secondary mb-1"
						>
							Name <span className="text-red-500">*</span>
						</label>
						<input
							id="account-name"
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g. Main wallet"
							className="block w-full rounded border border-strong bg-surface-card px-2 py-1.5 text-sm text-primary shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
							autoFocus
						/>
					</div>

					<div>
						<label
							htmlFor="account-description"
							className="block text-xs font-medium text-secondary mb-1"
						>
							Description
						</label>
						<textarea
							id="account-description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Optional"
							rows={2}
							className="block w-full rounded border border-strong bg-surface-card px-2 py-1.5 text-sm text-primary shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
						/>
					</div>

					<div>
						<label
							htmlFor="account-balance"
							className="block text-xs font-medium text-secondary mb-1"
						>
							{forDebt ? 'Outstanding debt' : 'Start balance'}
						</label>
						<input
							id="account-balance"
							type="number"
							step="any"
							min="0"
							value={initialBalance === 0 ? '' : initialBalance}
							onChange={(e) =>
								setInitialBalance(
									e.target.value === ''
										? 0
										: Math.abs(Number(e.target.value)),
								)
							}
							placeholder="0"
							className="block w-full rounded border border-strong bg-surface-card px-2 py-1.5 text-sm text-primary shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
						/>
						{forDebt && initialBalance > 0 && (
							<p className="mt-1 text-xs text-muted">
								Will be saved as {formatDebtPreview(-initialBalance, currencyCode)}
							</p>
						)}
					</div>

					<div>
						<label
							htmlFor="account-currency"
							className="block text-xs font-medium text-secondary mb-1"
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
							className="block w-full rounded border border-strong bg-surface-card px-2 py-1.5 text-sm text-primary shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
						>
							{currencyOptions.map(({ value, label }) => (
								<option key={value} value={value}>
									{label}
								</option>
							))}
						</select>
					</div>

					{isCrypto && (
						<TrackingFields
							idPrefix="new"
							tracking={tracking}
							setTracking={setTracking}
							categories={categories}
						/>
					)}

					<div className="flex gap-2 pt-2">
						<button
							type="button"
							onClick={handleClose}
							className="flex-1 px-4 py-2 text-sm font-medium text-secondary bg-surface-card border border-strong rounded-md hover:bg-surface-hover"
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
	forDebt?: boolean
}

export function EditAccountModal({
	isOpen,
	onClose,
	onSuccess,
	account,
	forDebt = false,
}: EditAccountModalProps) {
	const accountTypeOptions = forDebt
		? DEBT_ACCOUNT_TYPES
		: ASSET_ACCOUNT_TYPES
	const [accountType, setAccountType] = useState<AccountType>('cash')
	const [name, setName] = useState('')
	const [description, setDescription] = useState('')
	const [currencyCode, setCurrencyCode] = useState('USD')
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [tracking, setTracking] = useState<TrackingState>(EMPTY_TRACKING)
	const [existingWatch, setExistingWatch] = useState<WalletWatch | null>(null)
	const [categories, setCategories] = useState<Category[]>([])
	const [pollingNow, setPollingNow] = useState(false)
	const [pollResult, setPollResult] = useState<string | null>(null)

	const isCrypto = accountType === 'crypto'
	const currencyOptions = isCrypto ? CRYPTO_CURRENCIES : FIAT_CURRENCIES

	useEffect(() => {
		if (!account) return
		setAccountType(account.accountType)
		setName(account.name)
		setDescription(account.description ?? '')
		setCurrencyCode(account.currencyCode)
		setError(null)
		setPollResult(null)

		if (account.accountType === 'crypto') {
			fetchWalletWatchByAccountId(account.id)
				.then((watch) => {
					setExistingWatch(watch)
					if (watch) {
						setTracking({
							enabled: true,
							chain: watch.chain,
							walletAddress: watch.walletAddress,
							defaultCategoryId: watch.defaultCategoryId ?? '',
							pollIntervalMs: watch.pollIntervalMs,
						})
					} else {
						setTracking(EMPTY_TRACKING)
					}
				})
				.catch(() => setExistingWatch(null))
			fetchCategories().then(setCategories).catch(() => {})
		} else {
			setExistingWatch(null)
			setTracking(EMPTY_TRACKING)
		}
	}, [account])

	useEffect(() => {
		if (isCrypto && categories.length === 0) {
			fetchCategories().then(setCategories).catch(() => {})
		}
	}, [isCrypto, categories.length])

	function handleAccountTypeChange(newType: AccountType) {
		setAccountType(newType)
		if (newType === 'crypto') {
			setCurrencyCode('USDT')
		} else if (currencyCode === 'USDT' || currencyCode === 'USDC') {
			setCurrencyCode('USD')
		}
		if (newType !== 'crypto') {
			setTracking(EMPTY_TRACKING)
		}
	}

	const handleClose = useCallback(() => {
		setError(null)
		setPollResult(null)
		onClose()
	}, [onClose])

	async function handlePollNow() {
		if (!existingWatch) return
		setPollingNow(true)
		setPollResult(null)
		try {
			const result = await pollWalletWatchNow(existingWatch.id)
			setPollResult(
				`${result.message} (${result.created} new transaction${result.created !== 1 ? 's' : ''})`,
			)
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: 'Failed to poll wallet',
			)
		} finally {
			setPollingNow(false)
		}
	}

	async function handleTogglePause() {
		if (!existingWatch) return
		try {
			const updated = await updateWalletWatch(existingWatch.id, {
				isActive: !existingWatch.isActive,
			})
			setExistingWatch(updated)
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: 'Failed to toggle watch',
			)
		}
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (!account) return
		const trimmedName = name.trim()
		if (!trimmedName) {
			setError('Name is required')
			return
		}
		if (isCrypto && tracking.enabled) {
			if (!tracking.walletAddress) {
				setError('Wallet address is required for tracking')
				return
			}
			if (
				!existingWatch &&
				!ADDRESS_PATTERNS[tracking.chain].test(tracking.walletAddress)
			) {
				setError(
					`Invalid ${CHAIN_OPTIONS.find((c) => c.value === tracking.chain)?.label} address format`,
				)
				return
			}
		}
		setError(null)
		setIsSubmitting(true)
		try {
			await updateAccount(account.id, {
				accountType,
				name: trimmedName,
				description: description.trim() || null,
				currencyCode,
			})

			if (isCrypto) {
				if (tracking.enabled && existingWatch) {
					await updateWalletWatch(existingWatch.id, {
						defaultCategoryId: tracking.defaultCategoryId || null,
						pollIntervalMs: tracking.pollIntervalMs,
					})
				} else if (tracking.enabled && !existingWatch) {
					await createWalletWatch({
						chain: tracking.chain,
						walletAddress: tracking.walletAddress,
						accountId: account.id,
						defaultCategoryId: tracking.defaultCategoryId || null,
						pollIntervalMs: tracking.pollIntervalMs,
					})
				} else if (!tracking.enabled && existingWatch) {
					await deleteWalletWatch(existingWatch.id)
				}
			} else if (existingWatch) {
				await deleteWalletWatch(existingWatch.id)
			}

			handleClose()
			onSuccess()
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: 'Failed to update account',
			)
		} finally {
			setIsSubmitting(false)
		}
	}

	if (!isOpen || !account) return null

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			<div
				className="absolute inset-0 bg-black/40"
				onClick={handleClose}
				aria-hidden="true"
			/>
			<div className="relative z-10 w-full max-w-md bg-surface-card border rounded-md shadow-xl mx-4 max-h-[90vh] overflow-y-auto">
				<header className="flex items-center justify-between px-6 py-3 border-b">
					<h2 className="text-sm font-semibold tracking-wide text-primary uppercase">
						Edit account
					</h2>
					<button
						type="button"
						onClick={handleClose}
						className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-surface-hover hover:text-secondary"
						aria-label="Close"
					>
						✕
					</button>
				</header>

				<form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
					{error && (
						<p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 px-3 py-2 rounded">
							{error}
						</p>
					)}

					{pollResult && (
						<p className="text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-3 py-2 rounded">
							{pollResult}
						</p>
					)}

					<div>
						<label
							htmlFor="edit-account-type"
							className="block text-xs font-medium text-secondary mb-1"
						>
							Account type
						</label>
						<select
							id="edit-account-type"
							value={accountType}
							onChange={(e) =>
								handleAccountTypeChange(e.target.value as AccountType)
							}
							className="block w-full rounded border border-strong bg-surface-card px-2 py-1.5 text-sm text-primary shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
						>
							{accountTypeOptions.map(({ value, label }) => (
								<option key={value} value={value}>
									{label}
								</option>
							))}
						</select>
					</div>

					<div>
						<label
							htmlFor="edit-account-name"
							className="block text-xs font-medium text-secondary mb-1"
						>
							Name <span className="text-red-500">*</span>
						</label>
						<input
							id="edit-account-name"
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g. Main wallet"
							className="block w-full rounded border border-strong bg-surface-card px-2 py-1.5 text-sm text-primary shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
							autoFocus
						/>
					</div>

					<div>
						<label
							htmlFor="edit-account-description"
							className="block text-xs font-medium text-secondary mb-1"
						>
							Description
						</label>
						<textarea
							id="edit-account-description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Optional"
							rows={2}
							className="block w-full rounded border border-strong bg-surface-card px-2 py-1.5 text-sm text-primary shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
						/>
					</div>

					<div>
						<label
							htmlFor="edit-account-currency"
							className="block text-xs font-medium text-secondary mb-1"
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
							className="block w-full rounded border border-strong bg-surface-card px-2 py-1.5 text-sm text-primary shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
						>
							{currencyOptions.map(({ value, label }) => (
								<option key={value} value={value}>
									{label}
								</option>
							))}
						</select>
					</div>

					{isCrypto && (
						<>
							<TrackingFields
								idPrefix="edit"
								tracking={tracking}
								setTracking={setTracking}
								categories={categories}
								readOnlyChainAddress={!!existingWatch}
							/>
							{existingWatch && tracking.enabled && (
								<div className="flex items-center gap-2 text-xs">
									<button
										type="button"
										onClick={handlePollNow}
										disabled={pollingNow || !existingWatch.isActive}
										className="font-medium text-emerald-600 hover:text-emerald-800 disabled:text-faint disabled:cursor-not-allowed transition-colors"
									>
										{pollingNow ? 'Polling…' : 'Poll Now'}
									</button>
									<span className="text-faint">|</span>
									<button
										type="button"
										onClick={handleTogglePause}
										className={`font-medium transition-colors ${
											existingWatch.isActive
												? 'text-amber-600 hover:text-amber-800'
												: 'text-emerald-600 hover:text-emerald-800'
										}`}
									>
										{existingWatch.isActive ? 'Pause' : 'Resume'}
									</button>
									{existingWatch.lastCheckedAt && (
										<>
											<span className="text-faint">|</span>
											<span className="text-muted">
												Last check:{' '}
												{new Date(existingWatch.lastCheckedAt).toLocaleDateString('en-US', {
													month: 'short',
													day: 'numeric',
													hour: '2-digit',
													minute: '2-digit',
												})}
											</span>
										</>
									)}
								</div>
							)}
						</>
					)}

					<div className="flex gap-2 pt-2">
						<button
							type="button"
							onClick={handleClose}
							className="flex-1 px-4 py-2 text-sm font-medium text-secondary bg-surface-card border border-strong rounded-md hover:bg-surface-hover"
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
