import { useState, useEffect, useCallback } from 'react'
import { clsx } from '@/lib/clsx'
import {
	fetchWalletWatches,
	createWalletWatch,
	updateWalletWatch,
	deleteWalletWatch,
	pollWalletWatchNow,
	type WalletWatch,
	type Chain,
} from '@/api'
import type { Account, Category } from '@/types'
import { fetchAccounts, fetchCategories } from '@/api'

function WalletIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
				d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 110-6h.008A2.25 2.25 0 0017.25 6H5.25A2.25 2.25 0 003 8.25v7.5A2.25 2.25 0 005.25 18h13.5A2.25 2.25 0 0021 15.75v-3.75zM15 12h.008"
			/>
		</svg>
	)
}

const CHAIN_LABELS: Record<Chain, string> = {
	ethereum: 'Ethereum',
	tron: 'Tron',
	solana: 'Solana',
}

const CHAIN_COLORS: Record<Chain, string> = {
	ethereum: 'bg-indigo-100 text-indigo-700 border-indigo-200',
	tron: 'bg-red-100 text-red-700 border-red-200',
	solana: 'bg-purple-100 text-purple-700 border-purple-200',
}

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

interface WatchFormData {
	chain: Chain
	walletAddress: string
	accountId: string
	defaultCategoryId: string
}

const EMPTY_FORM: WatchFormData = {
	chain: 'ethereum',
	walletAddress: '',
	accountId: '',
	defaultCategoryId: '',
}

function WatchForm({
	initialData,
	accounts,
	categories,
	onSubmit,
	onCancel,
	isSubmitting,
	isEdit,
}: {
	initialData: WatchFormData
	accounts: Account[]
	categories: Category[]
	onSubmit: (data: WatchFormData) => void
	onCancel: () => void
	isSubmitting: boolean
	isEdit?: boolean
}) {
	const [form, setForm] = useState<WatchFormData>(initialData)
	const [validationError, setValidationError] = useState<string | null>(
		null,
	)

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (!form.walletAddress.trim()) {
			setValidationError('Wallet address is required')
			return
		}
		if (!isEdit && !ADDRESS_PATTERNS[form.chain].test(form.walletAddress.trim())) {
			setValidationError(
				`Invalid ${CHAIN_LABELS[form.chain]} address format`,
			)
			return
		}
		if (!form.accountId) {
			setValidationError('Account is required')
			return
		}
		setValidationError(null)
		onSubmit(form)
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-3">
			{validationError && (
				<p className="text-xs text-red-600">{validationError}</p>
			)}
			{!isEdit && (
				<div>
					<label
						htmlFor="watch-chain"
						className="block text-xs font-medium text-gray-700 mb-1"
					>
						Blockchain *
					</label>
					<select
						id="watch-chain"
						value={form.chain}
						onChange={(e) =>
							setForm((prev) => ({
								...prev,
								chain: e.target.value as Chain,
								walletAddress: '',
							}))
						}
						className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
					>
						{(Object.keys(CHAIN_LABELS) as Chain[]).map((c) => (
							<option key={c} value={c}>
								{CHAIN_LABELS[c]}
							</option>
						))}
					</select>
				</div>
			)}
			{!isEdit && (
				<div>
					<label
						htmlFor="watch-address"
						className="block text-xs font-medium text-gray-700 mb-1"
					>
						Wallet address *
					</label>
					<input
						id="watch-address"
						type="text"
						value={form.walletAddress}
						onChange={(e) =>
							setForm((prev) => ({
								...prev,
								walletAddress: e.target.value.trim(),
							}))
						}
						placeholder={ADDRESS_PLACEHOLDERS[form.chain]}
						className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 font-mono focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
					/>
				</div>
			)}
			<div>
				<label
					htmlFor="watch-account"
					className="block text-xs font-medium text-gray-700 mb-1"
				>
					Target account *
				</label>
				<select
					id="watch-account"
					value={form.accountId}
					onChange={(e) =>
						setForm((prev) => ({
							...prev,
							accountId: e.target.value,
						}))
					}
					className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
					required
				>
					<option value="">Select account...</option>
					{accounts.map((acc) => (
						<option key={acc.id} value={acc.id}>
							{acc.name} ({acc.currencyCode})
						</option>
					))}
				</select>
			</div>
			<div>
				<label
					htmlFor="watch-category"
					className="block text-xs font-medium text-gray-700 mb-1"
				>
					Default category (optional)
				</label>
				<select
					id="watch-category"
					value={form.defaultCategoryId}
					onChange={(e) =>
						setForm((prev) => ({
							...prev,
							defaultCategoryId: e.target.value,
						}))
					}
					className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
				>
					<option value="">None (auto-detect by direction)</option>
					{categories.map((cat) => (
						<option key={cat.id} value={cat.id}>
							{cat.name} ({cat.type})
						</option>
					))}
				</select>
			</div>
			<div className="flex gap-2 pt-1">
				<button
					type="submit"
					disabled={isSubmitting}
					className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					{isSubmitting ? 'Saving...' : 'Save'}
				</button>
				<button
					type="button"
					onClick={onCancel}
					className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
				>
					Cancel
				</button>
			</div>
		</form>
	)
}

function ChainBadge({ chain }: { chain: Chain }) {
	return (
		<span
			className={clsx(
				'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
				CHAIN_COLORS[chain],
			)}
		>
			{CHAIN_LABELS[chain]}
		</span>
	)
}

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	})
}

function truncateAddress(address: string): string {
	if (address.length <= 16) return address
	return `${address.slice(0, 8)}...${address.slice(-6)}`
}

export function WalletWatchesSection() {
	const [watches, setWatches] = useState<WalletWatch[]>([])
	const [accounts, setAccounts] = useState<Account[]>([])
	const [categories, setCategories] = useState<Category[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [isAdding, setIsAdding] = useState(false)
	const [editingId, setEditingId] = useState<string | null>(null)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [deletingId, setDeletingId] = useState<string | null>(null)
	const [pollingId, setPollingId] = useState<string | null>(null)
	const [pollResult, setPollResult] = useState<string | null>(null)

	const loadData = useCallback(async () => {
		try {
			const [watchesData, accountsData, categoriesData] =
				await Promise.all([
					fetchWalletWatches(),
					fetchAccounts(),
					fetchCategories(),
				])
			setWatches(watchesData.rows)
			setAccounts(accountsData)
			setCategories(categoriesData)
			setError(null)
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'Failed to load data',
			)
		} finally {
			setIsLoading(false)
		}
	}, [])

	useEffect(() => {
		loadData()
	}, [loadData])

	async function handleCreate(data: WatchFormData) {
		setIsSubmitting(true)
		setError(null)
		try {
			await createWalletWatch({
				chain: data.chain,
				walletAddress: data.walletAddress,
				accountId: data.accountId,
				defaultCategoryId: data.defaultCategoryId || null,
			})
			setIsAdding(false)
			await loadData()
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: 'Failed to create watch',
			)
		} finally {
			setIsSubmitting(false)
		}
	}

	async function handleUpdate(id: string, data: WatchFormData) {
		setIsSubmitting(true)
		setError(null)
		try {
			await updateWalletWatch(id, {
				accountId: data.accountId,
				defaultCategoryId: data.defaultCategoryId || null,
			})
			setEditingId(null)
			await loadData()
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: 'Failed to update watch',
			)
		} finally {
			setIsSubmitting(false)
		}
	}

	async function handleDelete(id: string) {
		setDeletingId(id)
		setError(null)
		try {
			await deleteWalletWatch(id)
			await loadData()
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: 'Failed to delete watch',
			)
		} finally {
			setDeletingId(null)
		}
	}

	async function handleToggleActive(watch: WalletWatch) {
		setError(null)
		try {
			await updateWalletWatch(watch.id, {
				isActive: !watch.isActive,
			})
			await loadData()
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: 'Failed to toggle watch',
			)
		}
	}

	async function handlePollNow(id: string) {
		setPollingId(id)
		setPollResult(null)
		setError(null)
		try {
			const result = await pollWalletWatchNow(id)
			setPollResult(
				`${result.message} (${result.created} new transaction${result.created !== 1 ? 's' : ''})`,
			)
			await loadData()
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: 'Failed to poll wallet',
			)
		} finally {
			setPollingId(null)
		}
	}

	function getAccountName(accountId: string): string {
		const acc = accounts.find((a) => a.id === accountId)
		return acc ? `${acc.name} (${acc.currencyCode})` : `#${accountId}`
	}

	function getCategoryName(categoryId: string | null): string {
		if (!categoryId) return 'Auto-detect'
		const cat = categories.find((c) => c.id === categoryId)
		return cat?.name ?? `#${categoryId}`
	}

	function getEditFormData(watch: WalletWatch): WatchFormData {
		return {
			chain: watch.chain,
			walletAddress: watch.walletAddress,
			accountId: watch.accountId,
			defaultCategoryId: watch.defaultCategoryId ?? '',
		}
	}

	return (
		<section aria-labelledby="wallet-watches-heading">
			<div className="flex items-start gap-3 mb-4">
				<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
					<WalletIcon className="w-5 h-5" />
				</div>
				<div className="flex-1">
					<h3
						id="wallet-watches-heading"
						className="text-base font-semibold text-gray-900"
					>
						Blockchain Wallets
					</h3>
					<p className="text-sm text-gray-500 mt-0.5">
						Monitor your non-custodial wallets (TrustWallet,
						MetaMask, etc.) for USDT/USDC transfers. Transactions
						are imported automatically every 5 minutes.
					</p>
				</div>
				{!isAdding && (
					<button
						type="button"
						onClick={() => {
							setIsAdding(true)
							setEditingId(null)
						}}
						className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 transition-colors"
					>
						+ Add Wallet
					</button>
				)}
			</div>

			{error && (
				<div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 mb-4">
					{error}
				</div>
			)}

			{pollResult && (
				<div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800 mb-4 flex items-center justify-between">
					<span>{pollResult}</span>
					<button
						type="button"
						onClick={() => setPollResult(null)}
						className="text-violet-600 hover:text-violet-800 ml-2"
						aria-label="Dismiss"
					>
						<svg
							className="w-4 h-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>
			)}

			{isAdding && (
				<div className="rounded-lg border border-violet-200 bg-violet-50/30 p-4 mb-4">
					<p className="text-sm font-medium text-gray-900 mb-3">
						Add Blockchain Wallet
					</p>
					<WatchForm
						initialData={EMPTY_FORM}
						accounts={accounts}
						categories={categories}
						onSubmit={handleCreate}
						onCancel={() => setIsAdding(false)}
						isSubmitting={isSubmitting}
					/>
				</div>
			)}

			{isLoading ? (
				<p className="text-sm text-gray-500 py-4 text-center">
					Loading wallet watches...
				</p>
			) : watches.length === 0 && !isAdding ? (
				<div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-center">
					<p className="text-sm text-gray-500">
						No wallets configured. Add a wallet address to
						automatically import USDT/USDC transfers.
					</p>
				</div>
			) : (
				<div className="space-y-2">
					{watches.map((watch) => (
						<div
							key={watch.id}
							className="rounded-lg border border-gray-200 bg-white"
						>
							{editingId === watch.id ? (
								<div className="p-4">
									<p className="text-sm font-medium text-gray-900 mb-3">
										Edit Wallet Watch
									</p>
									<WatchForm
										initialData={getEditFormData(watch)}
										accounts={accounts}
										categories={categories}
										onSubmit={(data) =>
											handleUpdate(watch.id, data)
										}
										onCancel={() => setEditingId(null)}
										isSubmitting={isSubmitting}
										isEdit
									/>
								</div>
							) : (
								<div className="px-4 py-3">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3 min-w-0">
											<ChainBadge
												chain={watch.chain}
											/>
											<span className="text-sm font-mono text-gray-700 truncate">
												{truncateAddress(
													watch.walletAddress,
												)}
											</span>
											<span className="text-gray-300">
												&rarr;
											</span>
											<span className="text-sm font-medium text-gray-900 truncate">
												{getAccountName(
													watch.accountId,
												)}
											</span>
										</div>
										<div className="flex items-center gap-2 shrink-0 ml-4">
											<button
												type="button"
												onClick={() =>
													handlePollNow(watch.id)
												}
												disabled={
													pollingId === watch.id
												}
												className={clsx(
													'text-xs font-medium transition-colors',
													pollingId === watch.id
														? 'text-gray-400'
														: 'text-violet-600 hover:text-violet-800',
												)}
												title="Fetch new transactions now"
											>
												{pollingId === watch.id
													? 'Polling...'
													: 'Poll Now'}
											</button>
											<button
												type="button"
												onClick={() =>
													handleToggleActive(watch)
												}
												className={clsx(
													'text-xs font-medium transition-colors',
													watch.isActive
														? 'text-amber-600 hover:text-amber-800'
														: 'text-emerald-600 hover:text-emerald-800',
												)}
											>
												{watch.isActive
													? 'Pause'
													: 'Resume'}
											</button>
											<button
												type="button"
												onClick={() => {
													setEditingId(watch.id)
													setIsAdding(false)
												}}
												className="text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
											>
												Edit
											</button>
											<button
												type="button"
												onClick={() =>
													handleDelete(watch.id)
												}
												disabled={
													deletingId === watch.id
												}
												className={clsx(
													'text-xs font-medium transition-colors',
													deletingId === watch.id
														? 'text-gray-400'
														: 'text-red-600 hover:text-red-800',
												)}
											>
												{deletingId === watch.id
													? 'Deleting...'
													: 'Delete'}
											</button>
										</div>
									</div>
									<div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
										<span>
											Category:{' '}
											{getCategoryName(
												watch.defaultCategoryId,
											)}
										</span>
										<span
											className={clsx(
												'inline-flex items-center gap-1',
											)}
										>
											<span
												className={clsx(
													'w-1.5 h-1.5 rounded-full',
													watch.isActive
														? 'bg-emerald-500'
														: 'bg-gray-400',
												)}
											/>
											{watch.isActive
												? 'Active'
												: 'Paused'}
										</span>
										{watch.lastCheckedAt && (
											<span>
												Last checked:{' '}
												{formatDate(
													watch.lastCheckedAt,
												)}
											</span>
										)}
									</div>
								</div>
							)}
						</div>
					))}
				</div>
			)}
		</section>
	)
}
