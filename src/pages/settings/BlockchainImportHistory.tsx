import { useState, useEffect, useCallback } from 'react'
import { clsx } from '@/lib/clsx'
import { fetchBlockchainImports, type BlockchainImport } from '@/api'
import type { Chain } from '@/api'

function CubeIcon({ className }: { className?: string }) {
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
				d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"
			/>
		</svg>
	)
}

const STATUS_CONFIG: Record<
	BlockchainImport['status'],
	{ label: string; className: string }
> = {
	processed: {
		label: 'Processed',
		className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
	},
	failed: {
		label: 'Failed',
		className: 'bg-red-50 text-red-700 border-red-200',
	},
	skipped: {
		label: 'Skipped',
		className: 'bg-orange-50 text-orange-700 border-orange-200',
	},
}

const CHAIN_LABELS: Record<Chain, string> = {
	ethereum: 'ETH',
	tron: 'TRX',
	solana: 'SOL',
}

const CHAIN_COLORS: Record<Chain, string> = {
	ethereum: 'text-indigo-600',
	tron: 'text-red-600',
	solana: 'text-purple-600',
}

const EXPLORER_URLS: Record<Chain, string> = {
	ethereum: 'https://etherscan.io/tx/',
	tron: 'https://tronscan.org/#/transaction/',
	solana: 'https://solscan.io/tx/',
}

function StatusBadge({ status }: { status: BlockchainImport['status'] }) {
	const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.failed
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

function truncateHash(hash: string): string {
	if (hash.length <= 16) return hash
	return `${hash.slice(0, 8)}...${hash.slice(-6)}`
}

function truncateAddress(address: string): string {
	if (address.length <= 16) return address
	return `${address.slice(0, 8)}...${address.slice(-6)}`
}

function getExplorerUrl(chain: string, txHash: string): string {
	const base = EXPLORER_URLS[chain as Chain]
	return base ? `${base}${txHash}` : '#'
}

const PAGE_SIZE = 20

export function BlockchainImportHistory() {
	const [imports, setImports] = useState<BlockchainImport[]>([])
	const [total, setTotal] = useState(0)
	const [page, setPage] = useState(0)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [expandedId, setExpandedId] = useState<string | null>(null)

	const loadImports = useCallback(async () => {
		setIsLoading(true)
		try {
			const result = await fetchBlockchainImports({
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
					: 'Failed to load blockchain imports',
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
		<section aria-labelledby="blockchain-history-heading">
			<div className="flex items-start gap-3 mb-4">
				<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
					<CubeIcon className="w-5 h-5" />
				</div>
				<div className="flex-1">
					<h3
						id="blockchain-history-heading"
						className="text-base font-semibold text-gray-900"
					>
						Blockchain Import History
					</h3>
					<p className="text-sm text-gray-500 mt-0.5">
						View all blockchain transactions detected by the
						wallet poller, their processing status, and details.
					</p>
				</div>
				{total > 0 && (
					<span className="shrink-0 text-xs text-gray-400 mt-1">
						{total} total
					</span>
				)}
			</div>

			{error && (
				<div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 mb-4">
					{error}
				</div>
			)}

			{isLoading && imports.length === 0 ? (
				<p className="text-sm text-gray-500 py-4 text-center">
					Loading blockchain imports...
				</p>
			) : imports.length === 0 ? (
				<div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-center">
					<p className="text-sm text-gray-500">
						No blockchain imports yet. Transactions will appear
						here once the poller detects transfers to your
						watched wallets.
					</p>
				</div>
			) : (
				<>
					<div className="space-y-2">
						{imports.map((imp) => {
							const isExpanded = expandedId === imp.id
							const chain = imp.chain as Chain
							return (
								<div
									key={imp.id}
									className="rounded-lg border border-gray-200 bg-white overflow-hidden"
								>
									<button
										type="button"
										onClick={() =>
											setExpandedId(
												isExpanded
													? null
													: imp.id,
											)
										}
										className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
										aria-expanded={isExpanded}
									>
										<StatusBadge
											status={imp.status}
										/>
										<span
											className={clsx(
												'text-xs font-semibold uppercase',
												CHAIN_COLORS[chain] ??
													'text-gray-600',
											)}
										>
											{CHAIN_LABELS[chain] ??
												imp.chain}
										</span>
										<span className="text-sm font-medium text-gray-900">
											{imp.amount}{' '}
											{imp.tokenSymbol}
										</span>
										<a
											href={getExplorerUrl(
												imp.chain,
												imp.txHash,
											)}
											target="_blank"
											rel="noopener noreferrer"
											onClick={(e) =>
												e.stopPropagation()
											}
											className="text-xs font-mono text-violet-600 hover:text-violet-800 hover:underline"
										>
											{truncateHash(imp.txHash)}
										</a>
										<span className="flex-1" />
										<span className="shrink-0 text-xs text-gray-400">
											{formatDate(
												imp.blockTimestamp ||
													imp.createdAt,
											)}
										</span>
										<svg
											className={clsx(
												'w-4 h-4 text-gray-400 transition-transform shrink-0',
												isExpanded &&
													'rotate-180',
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
										<div className="border-t border-gray-100 px-4 py-3 space-y-3 bg-gray-50/50">
											<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
												<div>
													<span className="text-gray-500 block">
														From
													</span>
													<span className="text-gray-800 font-medium font-mono break-all">
														{truncateAddress(
															imp.fromAddress,
														)}
													</span>
												</div>
												<div>
													<span className="text-gray-500 block">
														To
													</span>
													<span className="text-gray-800 font-medium font-mono break-all">
														{truncateAddress(
															imp.toAddress,
														)}
													</span>
												</div>
												<div>
													<span className="text-gray-500 block">
														Block
													</span>
													<span className="text-gray-800 font-medium">
														{imp.blockNumber?.toLocaleString() ??
															'—'}
													</span>
												</div>
												<div>
													<span className="text-gray-500 block">
														Operation ID
													</span>
													<span className="text-gray-800 font-medium">
														{imp.operationId ??
															'—'}
													</span>
												</div>
											</div>
											<div>
												<span className="text-xs text-gray-500 block mb-1">
													Full TX Hash
												</span>
												<a
													href={getExplorerUrl(
														imp.chain,
														imp.txHash,
													)}
													target="_blank"
													rel="noopener noreferrer"
													className="text-xs font-mono text-violet-600 hover:text-violet-800 hover:underline break-all"
												>
													{imp.txHash}
												</a>
											</div>
											{imp.errorMessage && (
												<div className="rounded-md border border-red-200 bg-red-50 px-3 py-2">
													<p className="text-xs font-medium text-red-700">
														Error
													</p>
													<p className="text-xs text-red-600 mt-0.5">
														{imp.errorMessage}
													</p>
												</div>
											)}
											{imp.rawData && (
												<div>
													<p className="text-xs font-medium text-gray-500 mb-1">
														Raw Data
													</p>
													<pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap break-all bg-white rounded-md border border-gray-200 px-3 py-2 max-h-48 overflow-y-auto">
														{JSON.stringify(
															imp.rawData,
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
								onClick={() =>
									setPage((p) => Math.max(0, p - 1))
								}
								disabled={page === 0}
								className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								Previous
							</button>
							<span className="text-xs text-gray-500">
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
								className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
