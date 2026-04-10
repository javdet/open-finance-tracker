import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { NavLink } from 'react-router-dom'
import type { Account } from '@/types'
import { DEBT_ACCOUNT_TYPES } from '@/types'
import { clsx } from '@/lib/clsx'
import { AddOperationModal } from './AddOperationModal'
import { AddAccountModal, EditAccountModal } from './AddAccountModal'
import { ScheduledTransactionCalendar } from '@/components/scheduled-transaction-calendar/scheduled-transaction-calendar'
import { UserMenu } from '@/components/user-menu/UserMenu'
import { fetchAccounts, fetchLatestExchangeRates } from '@/api'

const navItems = [
	{ to: '/dashboard', label: 'Dashboard' },
	{ to: '/transactions', label: 'Transactions' },
	{ to: '/budget', label: 'Budget' },
	{ to: '/categories', label: 'Categories' },
	{ to: '/settings', label: 'Settings' },
] as const

const BASE_CURRENCY_CODE = 'USD'

const STABLECOIN_TO_BASE: Record<string, number> = {
	USDT: 1,
	USDC: 1,
}


function getAccountTypeLabel(accountType: Account['accountType']): string {
	const labels: Record<Account['accountType'], string> = {
		cash: 'Cash',
		card: 'Card',
		bank: 'Bank',
		investment: 'Investment',
		loan: 'Loan',
		credit_card: 'Credit Card',
		mortgage: 'Mortgage',
		crypto: 'Crypto',
		other: 'Other',
	}
	return labels[accountType] ?? accountType
}

function formatCurrency(amount: number, currencyCode: string): string {
	try {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: currencyCode,
			maximumFractionDigits: 0,
		}).format(amount)
	} catch {
		// USDT, USDC and other non-ISO codes may throw; fallback to plain format
		const formatted = new Intl.NumberFormat('en-US', {
			maximumFractionDigits: 0,
		}).format(amount)
		return `${currencyCode} ${formatted}`
	}
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

function CalendarPlusIcon() {
	return (
		<svg
			className="w-5 h-5"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden
		>
			{/* Calendar */}
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
				d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
			/>
			{/* Small plus */}
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2.5}
				d="M14 12v4M12 14h4"
			/>
		</svg>
	)
}

function AssetsIcon() {
	return (
		<svg
			className="w-5 h-5"
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden
		>
			<path
				d="M7 4l5-3 5 3v10l-5 3-5-3V4z"
				fill="none"
			/>
			<path
				d="M8 16l4-12 4 12"
				className="stroke-positive"
				strokeWidth={2.5}
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M9.5 12h5"
				className="stroke-positive"
				strokeWidth={2}
				strokeLinecap="round"
			/>
			<path
				d="M19 14v5m0 0l-2-2m2 2l2-2"
				className="stroke-negative"
				strokeWidth={1.5}
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	)
}

function DebtsIcon() {
	return (
		<svg
			className="w-5 h-5"
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden
		>
			<path
				d="M12 3v14m0 0l-5-5m5 5l5-5"
				className="stroke-negative"
				strokeWidth={2.5}
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M19 10V5m0 0l-2 2m2-2l2 2"
				className="stroke-positive"
				strokeWidth={1.5}
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	)
}

export function AppLayout() {
	const [isAddOperationOpen, setIsAddOperationOpen] = useState(false)
	const [isAddRecurringOpen, setIsAddRecurringOpen] = useState(false)
	const [isAddAccountOpen, setIsAddAccountOpen] = useState(false)
	const [editingAccount, setEditingAccount] = useState<Account | null>(null)
	const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
		null,
	)
	const [accounts, setAccounts] = useState<Account[]>([])
	const [accountsError, setAccountsError] = useState<string | null>(null)
	const [fxRatesToBase, setFxRatesToBase] = useState<Record<string, number>>(
		STABLECOIN_TO_BASE,
	)
	const [fxError, setFxError] = useState<string | null>(null)
	const [, setIsFxLoading] = useState(false)
	const [showDebts, setShowDebts] = useState(false)

	function loadAccounts() {
		fetchAccounts()
			.then((data) => {
				setAccounts(data)
				setAccountsError(null)
			})
			.catch((err: Error) => setAccountsError(err.message))
	}

	useEffect(() => {
		loadAccounts()
	}, [])

	useEffect(() => {
		const handler = () => loadAccounts()
		window.addEventListener('operation-created', handler)
		return () => window.removeEventListener('operation-created', handler)
	}, [])

	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
				e.preventDefault()
				setIsAddOperationOpen(true)
			}
		}
		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [])

	function handleEdit(account: Account) {
		setEditingAccount(account)
	}

	function handleEditSuccess() {
		loadAccounts()
		setEditingAccount(null)
	}

	const activeAccounts = accounts.filter((a) => a.isActive)
	const foreignCurrencyCodes = Array.from(
		new Set(
			activeAccounts
				.map((account) => account.currencyCode)
				.filter(
					(code) =>
						code !== BASE_CURRENCY_CODE && !STABLECOIN_TO_BASE[code],
				),
		),
	)

	useEffect(() => {
		if (foreignCurrencyCodes.length === 0) {
			setFxError(null)
			return
		}

		setIsFxLoading(true)

		fetchLatestExchangeRates(BASE_CURRENCY_CODE, foreignCurrencyCodes)
			.then((response) => {
				const toBase: Record<string, number> = {}

				Object.entries(response.rates).forEach(([code, rate]) => {
					if (rate > 0) {
						toBase[code] = 1 / rate
					}
				})

				setFxRatesToBase((prev) => ({
					...prev,
					...STABLECOIN_TO_BASE,
					...toBase,
				}))
				setFxError(null)
			})
			.catch(() => {
				setFxError(
					'Some balances may be missing from total due to exchange rate error.',
				)
			})
			.finally(() => {
				setIsFxLoading(false)
			})
	}, [foreignCurrencyCodes.join(',')])

	const accountBalance = (account: Account) => {
		const raw = account.balance ?? account.initialBalance
		if (DEBT_ACCOUNT_TYPES.has(account.accountType)) {
			return Math.min(0, raw)
		}
		return raw
	}

	const assetAccounts = activeAccounts.filter(
		(a) => !DEBT_ACCOUNT_TYPES.has(a.accountType),
	)
	const debtAccounts = activeAccounts.filter(
		(a) =>
			DEBT_ACCOUNT_TYPES.has(a.accountType) ||
			(a.balance ?? a.initialBalance) < 0,
	)
	const displayedAccounts = showDebts ? debtAccounts : assetAccounts

	function sumBalanceBase(list: Account[]): number {
		return list.reduce((sum, account) => {
			const balance = accountBalance(account)
			if (account.currencyCode === BASE_CURRENCY_CODE) {
				return sum + balance
			}
			const rateToBase = fxRatesToBase[account.currencyCode]
			if (rateToBase) {
				return sum + balance * rateToBase
			}
			return sum
		}, 0)
	}

	const totalAssetsBase = sumBalanceBase(assetAccounts)
	const totalDebtsBase = activeAccounts
		.filter((a) => DEBT_ACCOUNT_TYPES.has(a.accountType))
		.reduce((sum, account) => {
			const balance = accountBalance(account)
			if (account.currencyCode === BASE_CURRENCY_CODE) {
				return sum + balance
			}
			const rateToBase = fxRatesToBase[account.currencyCode]
			if (rateToBase) {
				return sum + balance * rateToBase
			}
			return sum
		}, 0)
	const displayedTotal = showDebts ? totalDebtsBase : totalAssetsBase

	return (
		<div className="min-h-screen flex flex-col bg-surface">
			<header className="bg-surface-alt border-b px-4 py-3 flex items-center justify-between">
				<h1 className="text-xl font-semibold text-primary">
					Finance Tracker
				</h1>
				<UserMenu />
			</header>
			<nav
				className="bg-surface-card border-b px-2 py-2 flex items-center gap-1 overflow-x-auto"
				aria-label="Main navigation"
			>
				<button
					type="button"
					onClick={() => setIsAddOperationOpen(true)}
					className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md border border-emerald-600 bg-emerald-600 text-lg leading-none text-white hover:bg-emerald-700 hover:border-emerald-700"
					aria-label="Add Transaction"
					title="Add Transaction"
				>
					+
				</button>
				<button
					type="button"
					onClick={() => setIsAddRecurringOpen(true)}
					className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md border border-strong bg-surface-card text-secondary hover:bg-surface-hover"
					aria-label="Add Scheduled Transaction"
					title="Add Scheduled Transaction"
				>
					<CalendarPlusIcon />
				</button>
				{navItems.map(({ to, label }) => (
					<NavLink
						key={to}
						to={to}
						className={({ isActive }) =>
							clsx(
								'px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap',
								isActive
									? 'bg-nav-active text-white'
									: 'text-secondary hover:bg-surface-hover',
							)
						}
					>
						{label}
					</NavLink>
				))}
			</nav>
			<div className="flex-1 flex flex-col md:flex-row">
				<aside className="w-full md:w-72 border-b md:border-b-0 md:border-r bg-surface-alt">
					<div className="p-4">
						<div className="bg-surface-card rounded-lg border shadow-sm p-4">
							<div className="flex items-baseline justify-between gap-2">
								<div>
									<p className="text-xs font-semibold uppercase tracking-wide text-muted">
										{showDebts ? 'Debts' : 'Money'}
									</p>
									<p className="text-xs text-muted">
										{showDebts
											? 'Loans & credit'
											: 'Accounts & balance'}
									</p>
								</div>
								<div className="flex items-center gap-1">
									<button
										type="button"
										onClick={() =>
											setShowDebts((prev) => !prev)
										}
										className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded border border-strong bg-surface-card hover:bg-surface-hover"
										aria-label={
											showDebts
												? 'Switch to assets'
												: 'Switch to debts'
										}
										title={
											showDebts
												? 'Show assets'
												: 'Show debts'
										}
									>
										{showDebts ? (
											<AssetsIcon />
										) : (
											<DebtsIcon />
										)}
									</button>
									<button
										type="button"
										onClick={() => setIsAddAccountOpen(true)}
										className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded border border-emerald-600 bg-surface-card text-sm font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 hover:border-emerald-700"
										aria-label="Add account"
									>
										+
									</button>
									<p
										className={clsx(
											'text-base font-semibold',
											showDebts
												? 'text-negative'
												: displayedTotal < 0
													? 'text-negative'
													: 'text-positive',
										)}
									>
										{formatCurrency(
											displayedTotal,
											BASE_CURRENCY_CODE,
										)}
									</p>
								</div>
							</div>
							{accountsError && (
								<p className="mt-2 text-xs text-warning">
									{accountsError}
								</p>
							)}
							{fxError && (
								<p className="mt-1 text-xs text-warning">{fxError}</p>
							)}
							<ul className="mt-4 space-y-2">
								{displayedAccounts.map((account) => {
									const isSelected = selectedAccountId === account.id
									return (
										<li
											key={account.id}
											className={clsx(
												'group flex items-center justify-between text-sm rounded-md py-1 -mx-1 px-1',
											)}
											onMouseEnter={() =>
												setSelectedAccountId(account.id)
											}
											onMouseLeave={() =>
												setSelectedAccountId(null)
											}
										>
											<div className="flex flex-col min-w-0 flex-1">
												<span className="font-medium text-primary truncate">
													{account.name}
												</span>
												<span className="text-xs text-muted">
													{getAccountTypeLabel(account.accountType)}
												</span>
											</div>
											<div className="flex items-center gap-1 flex-shrink-0">
												<span
													className={clsx(
														'font-medium',
														accountBalance(account) < 0
															? 'text-negative'
															: 'text-positive',
													)}
												>
													{formatCurrency(
														accountBalance(account),
														account.currencyCode,
													)}
												</span>
												<button
													type="button"
													onClick={() =>
														handleEdit(account)
													}
													className={clsx(
														'inline-flex items-center justify-center w-6 h-6 rounded border border-emerald-600 text-emerald-600 transition-opacity hover:bg-emerald-50 dark:hover:bg-emerald-950',
														isSelected
															? 'opacity-100'
															: 'opacity-0 group-hover:opacity-100',
													)}
													aria-label="Edit account"
												>
													<PencilIcon />
												</button>
											</div>
										</li>
									)
								})}
							</ul>
						</div>
					</div>
				</aside>
				<main className="flex-1 p-4 md:p-6 overflow-y-auto">
					<Outlet />
				</main>
			</div>
			<AddOperationModal
				isOpen={isAddOperationOpen}
				onClose={() => setIsAddOperationOpen(false)}
				accounts={activeAccounts}
			/>
			<AddAccountModal
				isOpen={isAddAccountOpen}
				onClose={() => setIsAddAccountOpen(false)}
				onSuccess={loadAccounts}
				forDebt={showDebts}
			/>
			<EditAccountModal
				isOpen={editingAccount != null}
				onClose={() => setEditingAccount(null)}
				onSuccess={handleEditSuccess}
				account={editingAccount}
				forDebt={showDebts}
			/>
			<ScheduledTransactionCalendar
				isOpen={isAddRecurringOpen}
				onClose={() => setIsAddRecurringOpen(false)}
			/>
		</div>
	)
}
