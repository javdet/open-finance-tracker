import { useState, useEffect, useCallback } from 'react'
import { clsx } from '@/lib/clsx'
import { fetchSmsImports, type SmsImport } from '@/api'

function InboxIcon({ className }: { className?: string }) {
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
				d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
			/>
		</svg>
	)
}

const STATUS_CONFIG: Record<
	SmsImport['status'],
	{ label: string; className: string }
> = {
	processed: {
		label: 'Processed',
		className: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
	},
	failed: {
		label: 'Failed',
		className: 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
	},
	pending: {
		label: 'Pending',
		className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
	},
	duplicate: {
		label: 'Duplicate',
		className: 'bg-surface text-secondary',
	},
	skipped: {
		label: 'Skipped',
		className: 'bg-orange-50 text-orange-700 border-orange-200',
	},
}

function StatusBadge({ status }: { status: SmsImport['status'] }) {
	const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
	return (
		<span
			className={clsx(
				'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
				config.className,
			)}
		>
			{config.label}
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

function truncate(text: string, maxLen: number): string {
	if (text.length <= maxLen) return text
	return text.slice(0, maxLen) + '...'
}

const PAGE_SIZE = 20

export function SmsImportHistory() {
	const [imports, setImports] = useState<SmsImport[]>([])
	const [total, setTotal] = useState(0)
	const [page, setPage] = useState(0)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [expandedId, setExpandedId] = useState<string | null>(null)

	const loadImports = useCallback(async () => {
		setIsLoading(true)
		try {
			const result = await fetchSmsImports({
				limit: PAGE_SIZE,
				offset: page * PAGE_SIZE,
			})
			setImports(result.rows)
			setTotal(result.total)
			setError(null)
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: 'Failed to load import history',
			)
		} finally {
			setIsLoading(false)
		}
	}, [page])

	useEffect(() => {
		loadImports()
	}, [loadImports])

	const totalPages = Math.ceil(total / PAGE_SIZE)

	return (
		<section aria-labelledby="sms-history-heading">
			<div className="flex items-start gap-3 mb-4">
				<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600">
					<InboxIcon className="w-5 h-5" />
				</div>
				<div className="flex-1">
					<h3
						id="sms-history-heading"
						className="text-base font-semibold text-primary"
					>
						SMS Import History
					</h3>
					<p className="text-sm text-muted mt-0.5">
						View all SMS messages received by the webhook, their
						parse status, and any errors.
					</p>
				</div>
				{total > 0 && (
					<span className="shrink-0 text-xs text-faint mt-1">
						{total} total
					</span>
				)}
			</div>

			{error && (
				<div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 px-4 py-3 text-sm text-red-800 mb-4">
					{error}
				</div>
			)}

			{isLoading && imports.length === 0 ? (
				<p className="text-sm text-muted py-4 text-center">
					Loading import history...
				</p>
			) : imports.length === 0 ? (
				<div className="rounded-lg border bg-surface px-4 py-6 text-center">
					<p className="text-sm text-muted">
						No SMS imports yet. Messages will appear here once the
						webhook receives its first SMS.
					</p>
				</div>
			) : (
				<>
					<div className="space-y-2">
						{imports.map((sms) => {
							const isExpanded = expandedId === sms.id
							return (
								<div
									key={sms.id}
									className="rounded-lg border bg-surface-card overflow-hidden"
								>
									<button
										type="button"
										onClick={() =>
											setExpandedId(
												isExpanded ? null : sms.id,
											)
										}
										className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-hover transition-colors"
										aria-expanded={isExpanded}
									>
										<StatusBadge status={sms.status} />
										<span className="flex-1 text-sm text-secondary truncate font-mono">
											{truncate(sms.rawMessage, 80)}
										</span>
										<span className="shrink-0 text-xs text-faint">
											{formatDate(sms.createdAt)}
										</span>
										<svg
											className={clsx(
												'w-4 h-4 text-faint transition-transform shrink-0',
												isExpanded && 'rotate-180',
											)}
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
									</button>
									{isExpanded && (
										<div className="border-t border-subtle px-4 py-3 space-y-3 bg-surface/50">
											<div>
												<p className="text-xs font-medium text-muted mb-1">
													Raw Message
												</p>
												<pre className="text-xs text-primary font-mono whitespace-pre-wrap break-all bg-surface-card rounded-md border px-3 py-2">
													{sms.rawMessage}
												</pre>
											</div>
											<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
												<div>
													<span className="text-muted block">
														Sender
													</span>
													<span className="text-primary font-medium">
														{sms.sender || '—'}
													</span>
												</div>
												<div>
													<span className="text-muted block">
														Parser
													</span>
													<span className="text-primary font-medium">
														{sms.parserUsed || '—'}
													</span>
												</div>
												<div>
													<span className="text-muted block">
														Operation ID
													</span>
													<span className="text-primary font-medium">
														{sms.operationId || '—'}
													</span>
												</div>
												<div>
													<span className="text-muted block">
														Received
													</span>
													<span className="text-primary font-medium">
														{sms.receivedAt
															? formatDate(
																sms.receivedAt,
															)
															: '—'}
													</span>
												</div>
											</div>
											{sms.errorMessage && (
												<div className="rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 px-3 py-2">
													<p className="text-xs font-medium text-red-700 dark:text-red-300">
														Error
													</p>
													<p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
														{sms.errorMessage}
													</p>
												</div>
											)}
											{sms.parsedData && (
												<div>
													<p className="text-xs font-medium text-muted mb-1">
														Parsed Data
													</p>
													<pre className="text-xs text-secondary font-mono whitespace-pre-wrap break-all bg-surface-card rounded-md border px-3 py-2">
														{JSON.stringify(
															sms.parsedData,
															null,
															2,
														)}
													</pre>
												</div>
											)}
										</div>
									)}
								</div>
							)
						})}
					</div>

					{totalPages > 1 && (
						<div className="flex items-center justify-between mt-4">
							<button
								type="button"
								onClick={() => setPage((p) => Math.max(0, p - 1))}
								disabled={page === 0}
								className="rounded-lg border border-strong px-3 py-1.5 text-xs font-medium text-secondary hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								Previous
							</button>
							<span className="text-xs text-muted">
								Page {page + 1} of {totalPages}
							</span>
							<button
								type="button"
								onClick={() =>
									setPage((p) =>
										Math.min(totalPages - 1, p + 1),
									)
								}
								disabled={page >= totalPages - 1}
								className="rounded-lg border border-strong px-3 py-1.5 text-xs font-medium text-secondary hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								Next
							</button>
						</div>
					)}
				</>
			)}
		</section>
	)
}
