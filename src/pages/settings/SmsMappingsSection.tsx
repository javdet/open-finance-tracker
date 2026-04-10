import { useState, useEffect, useCallback } from 'react'
import { clsx } from '@/lib/clsx'
import {
	fetchSmsMappings,
	createSmsMapping,
	updateSmsMapping,
	deleteSmsMapping,
	type SmsAccountMapping,
} from '@/api'
import type { Account, Category } from '@/types'
import { fetchAccounts, fetchCategories } from '@/api'

function LinkIcon({ className }: { className?: string }) {
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
				d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
			/>
		</svg>
	)
}

interface MappingFormData {
	cardLast4: string
	accountLast4: string
	accountId: string
	defaultCategoryId: string
}

const EMPTY_FORM: MappingFormData = {
	cardLast4: '',
	accountLast4: '',
	accountId: '',
	defaultCategoryId: '',
}

function MappingForm({
	initialData,
	accounts,
	categories,
	onSubmit,
	onCancel,
	isSubmitting,
}: {
	initialData: MappingFormData
	accounts: Account[]
	categories: Category[]
	onSubmit: (data: MappingFormData) => void
	onCancel: () => void
	isSubmitting: boolean
}) {
	const [form, setForm] = useState<MappingFormData>(initialData)
	const [validationError, setValidationError] = useState<string | null>(null)

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (!form.cardLast4 && !form.accountLast4) {
			setValidationError(
				'At least one of Card last 4 or Account last 4 is required',
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

	const expenseCategories = categories.filter(
		(c) => c.type === 'expense',
	)

	return (
		<form onSubmit={handleSubmit} className="space-y-3">
			{validationError && (
				<p className="text-xs text-red-600 dark:text-red-400">{validationError}</p>
			)}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<div>
					<label
						htmlFor="mapping-card"
						className="block text-xs font-medium text-secondary mb-1"
					>
						Card last 4 digits
					</label>
					<input
						id="mapping-card"
						type="text"
						value={form.cardLast4}
						onChange={(e) =>
							setForm((prev) => ({
								...prev,
								cardLast4: e.target.value.replace(/\D/g, '').slice(0, 4),
							}))
						}
						placeholder="1234"
						maxLength={4}
						pattern="\d{4}"
						className="w-full rounded-lg border border-strong bg-surface-card px-3 py-2 text-sm text-primary placeholder:text-faint focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
					/>
				</div>
				<div>
					<label
						htmlFor="mapping-account-last4"
						className="block text-xs font-medium text-secondary mb-1"
					>
						Account last 4 digits
					</label>
					<input
						id="mapping-account-last4"
						type="text"
						value={form.accountLast4}
						onChange={(e) =>
							setForm((prev) => ({
								...prev,
								accountLast4: e.target.value
									.replace(/\D/g, '')
									.slice(0, 4),
							}))
						}
						placeholder="5678"
						maxLength={4}
						pattern="\d{4}"
						className="w-full rounded-lg border border-strong bg-surface-card px-3 py-2 text-sm text-primary placeholder:text-faint focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
					/>
				</div>
			</div>
			<div>
				<label
					htmlFor="mapping-account"
					className="block text-xs font-medium text-secondary mb-1"
				>
					Finance Tracker account *
				</label>
				<select
					id="mapping-account"
					value={form.accountId}
					onChange={(e) =>
						setForm((prev) => ({
							...prev,
							accountId: e.target.value,
						}))
					}
					className="w-full rounded-lg border border-strong bg-surface-card px-3 py-2 text-sm text-primary focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
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
					htmlFor="mapping-category"
					className="block text-xs font-medium text-secondary mb-1"
				>
					Default expense category (optional)
				</label>
				<select
					id="mapping-category"
					value={form.defaultCategoryId}
					onChange={(e) =>
						setForm((prev) => ({
							...prev,
							defaultCategoryId: e.target.value,
						}))
					}
					className="w-full rounded-lg border border-strong bg-surface-card px-3 py-2 text-sm text-primary focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
				>
					<option value="">None (use first expense category)</option>
					{expenseCategories.map((cat) => (
						<option key={cat.id} value={cat.id}>
							{cat.name}
						</option>
					))}
				</select>
			</div>
			<div className="flex gap-2 pt-1">
				<button
					type="submit"
					disabled={isSubmitting}
					className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					{isSubmitting ? 'Saving...' : 'Save'}
				</button>
				<button
					type="button"
					onClick={onCancel}
					className="rounded-lg border border-strong px-4 py-2 text-sm font-medium text-secondary hover:bg-surface-hover transition-colors"
				>
					Cancel
				</button>
			</div>
		</form>
	)
}

export function SmsMappingsSection() {
	const [mappings, setMappings] = useState<SmsAccountMapping[]>([])
	const [accounts, setAccounts] = useState<Account[]>([])
	const [categories, setCategories] = useState<Category[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [isAdding, setIsAdding] = useState(false)
	const [editingId, setEditingId] = useState<string | null>(null)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [deletingId, setDeletingId] = useState<string | null>(null)

	const loadData = useCallback(async () => {
		try {
			const [mappingsData, accountsData, categoriesData] =
				await Promise.all([
					fetchSmsMappings(),
					fetchAccounts(),
					fetchCategories(),
				])
			setMappings(mappingsData)
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

	async function handleCreate(data: MappingFormData) {
		setIsSubmitting(true)
		setError(null)
		try {
			await createSmsMapping({
				cardLast4: data.cardLast4 || null,
				accountLast4: data.accountLast4 || null,
				accountId: data.accountId,
				defaultCategoryId: data.defaultCategoryId || null,
			})
			setIsAdding(false)
			await loadData()
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: 'Failed to create mapping',
			)
		} finally {
			setIsSubmitting(false)
		}
	}

	async function handleUpdate(id: string, data: MappingFormData) {
		setIsSubmitting(true)
		setError(null)
		try {
			await updateSmsMapping(id, {
				cardLast4: data.cardLast4 || null,
				accountLast4: data.accountLast4 || null,
				accountId: data.accountId,
				defaultCategoryId: data.defaultCategoryId || null,
			})
			setEditingId(null)
			await loadData()
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: 'Failed to update mapping',
			)
		} finally {
			setIsSubmitting(false)
		}
	}

	async function handleDelete(id: string) {
		setDeletingId(id)
		setError(null)
		try {
			await deleteSmsMapping(id)
			await loadData()
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: 'Failed to delete mapping',
			)
		} finally {
			setDeletingId(null)
		}
	}

	function getAccountName(accountId: string): string {
		const acc = accounts.find((a) => a.id === accountId)
		return acc ? `${acc.name} (${acc.currencyCode})` : `#${accountId}`
	}

	function getCategoryName(categoryId: string | null): string {
		if (!categoryId) return 'Default'
		const cat = categories.find((c) => c.id === categoryId)
		return cat?.name ?? `#${categoryId}`
	}

	function getEditFormData(mapping: SmsAccountMapping): MappingFormData {
		return {
			cardLast4: mapping.cardLast4 ?? '',
			accountLast4: mapping.accountLast4 ?? '',
			accountId: mapping.accountId,
			defaultCategoryId: mapping.defaultCategoryId ?? '',
		}
	}

	return (
		<section aria-labelledby="sms-mappings-heading">
			<div className="flex items-start gap-3 mb-4">
				<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600">
					<LinkIcon className="w-5 h-5" />
				</div>
				<div className="flex-1">
					<h3
						id="sms-mappings-heading"
						className="text-base font-semibold text-primary"
					>
						SMS Account Mappings
					</h3>
					<p className="text-sm text-muted mt-0.5">
						Map bank card/account numbers to Finance Tracker accounts
						so SMS transactions are booked to the correct account.
					</p>
				</div>
				{!isAdding && (
					<button
						type="button"
						onClick={() => {
							setIsAdding(true)
							setEditingId(null)
						}}
						className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
					>
						+ Add Mapping
					</button>
				)}
			</div>

			{error && (
				<div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 px-4 py-3 text-sm text-red-800 mb-4">
					{error}
				</div>
			)}

			{isAdding && (
				<div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/30 p-4 mb-4">
					<p className="text-sm font-medium text-primary mb-3">
						New SMS Mapping
					</p>
					<MappingForm
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
				<p className="text-sm text-muted py-4 text-center">
					Loading mappings...
				</p>
			) : mappings.length === 0 && !isAdding ? (
				<div className="rounded-lg border bg-surface px-4 py-6 text-center">
					<p className="text-sm text-muted">
						No SMS account mappings configured. Add one to link your
						bank card to a Finance Tracker account.
					</p>
				</div>
			) : (
				<div className="space-y-2">
					{mappings.map((mapping) => (
						<div
							key={mapping.id}
							className="rounded-lg border bg-surface-card"
						>
							{editingId === mapping.id ? (
								<div className="p-4">
									<p className="text-sm font-medium text-primary mb-3">
										Edit Mapping
									</p>
									<MappingForm
										initialData={getEditFormData(mapping)}
										accounts={accounts}
										categories={categories}
										onSubmit={(data) =>
											handleUpdate(mapping.id, data)
										}
										onCancel={() => setEditingId(null)}
										isSubmitting={isSubmitting}
									/>
								</div>
							) : (
								<div className="flex items-center justify-between px-4 py-3">
									<div className="flex items-center gap-4 min-w-0">
										<div className="text-sm">
											{mapping.cardLast4 && (
												<span className="inline-flex items-center gap-1 text-secondary">
													<span className="text-xs text-faint">
														Card
													</span>
													<span className="font-mono font-medium">
														*{mapping.cardLast4}
													</span>
												</span>
											)}
											{mapping.cardLast4 &&
												mapping.accountLast4 && (
												<span className="text-faint mx-2">
														/
												</span>
											)}
											{mapping.accountLast4 && (
												<span className="inline-flex items-center gap-1 text-secondary">
													<span className="text-xs text-faint">
														Acct
													</span>
													<span className="font-mono font-medium">
														*{mapping.accountLast4}
													</span>
												</span>
											)}
										</div>
										<span className="text-faint">
											&rarr;
										</span>
										<div className="text-sm min-w-0">
											<span className="font-medium text-primary truncate">
												{getAccountName(
													mapping.accountId,
												)}
											</span>
											<span className="text-faint mx-1.5">
												&middot;
											</span>
											<span className="text-muted">
												{getCategoryName(
													mapping.defaultCategoryId,
												)}
											</span>
										</div>
									</div>
									<div className="flex items-center gap-2 shrink-0 ml-4">
										<button
											type="button"
											onClick={() => {
												setEditingId(mapping.id)
												setIsAdding(false)
											}}
											className="text-xs font-medium text-secondary hover:text-primary transition-colors"
										>
											Edit
										</button>
										<button
											type="button"
											onClick={() =>
												handleDelete(mapping.id)
											}
											disabled={
												deletingId === mapping.id
											}
											className={clsx(
												'text-xs font-medium transition-colors',
												deletingId === mapping.id
													? 'text-faint'
													: 'text-red-600 dark:text-red-400 hover:text-red-800',
											)}
										>
											{deletingId === mapping.id
												? 'Deleting...'
												: 'Delete'}
										</button>
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
