import { useState, useEffect, useCallback } from 'react'
import { clsx } from '@/lib/clsx'
import {
	fetchApiKeys,
	createApiKey,
	revokeApiKey,
	type ApiKey,
	type ApiKeyWithRaw,
} from '@/api'

function KeyIcon({ className }: { className?: string }) {
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
				d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
			/>
		</svg>
	)
}

function CopyButton({ text }: { text: string }) {
	const [copied, setCopied] = useState(false)

	function handleCopy() {
		navigator.clipboard.writeText(text).then(() => {
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		})
	}

	return (
		<button
			type="button"
			onClick={handleCopy}
			className={clsx(
				'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors',
				copied
					? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950'
					: 'text-muted hover:text-secondary hover:bg-surface-hover',
			)}
			aria-label="Copy to clipboard"
		>
			{copied ? 'Copied!' : 'Copy'}
		</button>
	)
}

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	})
}

export function ApiKeysSection() {
	const [keys, setKeys] = useState<ApiKey[]>([])
	const [newLabel, setNewLabel] = useState('')
	const [newKey, setNewKey] = useState<ApiKeyWithRaw | null>(null)
	const [isCreating, setIsCreating] = useState(false)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [revokingId, setRevokingId] = useState<string | null>(null)

	const loadKeys = useCallback(async () => {
		try {
			const data = await fetchApiKeys()
			setKeys(data)
			setError(null)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load keys')
		} finally {
			setIsLoading(false)
		}
	}, [])

	useEffect(() => {
		loadKeys()
	}, [loadKeys])

	async function handleCreate(e: React.FormEvent) {
		e.preventDefault()
		if (!newLabel.trim()) return

		setIsCreating(true)
		setError(null)
		try {
			const created = await createApiKey(newLabel.trim())
			setNewKey(created)
			setNewLabel('')
			await loadKeys()
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'Failed to create key',
			)
		} finally {
			setIsCreating(false)
		}
	}

	async function handleRevoke(id: string) {
		setRevokingId(id)
		setError(null)
		try {
			await revokeApiKey(id)
			if (newKey?.id === id) setNewKey(null)
			await loadKeys()
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'Failed to revoke key',
			)
		} finally {
			setRevokingId(null)
		}
	}

	return (
		<section aria-labelledby="api-keys-heading">
			<div className="flex items-start gap-3 mb-4">
				<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600">
					<KeyIcon className="w-5 h-5" />
				</div>
				<div>
					<h3
						id="api-keys-heading"
						className="text-base font-semibold text-primary"
					>
						API Keys
					</h3>
					<p className="text-sm text-muted mt-0.5">
						Generate API keys for the iOS Shortcut or other
						integrations to authenticate with the SMS webhook.
					</p>
				</div>
			</div>

			{error && (
				<div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 px-4 py-3 text-sm text-red-800 mb-4">
					{error}
				</div>
			)}

			{newKey && (
				<div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 mb-4">
					<p className="text-sm font-medium text-amber-800 mb-1">
						New API key created &mdash; copy it now!
					</p>
					<p className="text-xs text-amber-700 mb-2">
						This key will only be shown once. Store it securely.
					</p>
					<div className="flex items-center gap-2 bg-surface-card rounded-md border border-amber-200 px-3 py-2">
						<code className="flex-1 text-xs font-mono text-primary break-all select-all">
							{newKey.rawKey}
						</code>
						<CopyButton text={newKey.rawKey} />
					</div>
					<button
						type="button"
						onClick={() => setNewKey(null)}
						className="mt-2 text-xs text-amber-700 hover:text-amber-900 font-medium"
					>
						Dismiss
					</button>
				</div>
			)}

			<form
				onSubmit={handleCreate}
				className="flex gap-2 mb-4"
			>
				<input
					type="text"
					value={newLabel}
					onChange={(e) => setNewLabel(e.target.value)}
					placeholder="Key label (e.g. iPhone Shortcut)"
					className="flex-1 rounded-lg border border-strong bg-surface-card px-3 py-2 text-sm text-primary placeholder:text-faint focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
					maxLength={100}
				/>
				<button
					type="submit"
					disabled={isCreating || !newLabel.trim()}
					className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					{isCreating ? 'Creating...' : 'Generate Key'}
				</button>
			</form>

			{isLoading ? (
				<p className="text-sm text-muted py-4 text-center">
					Loading API keys...
				</p>
			) : keys.length === 0 ? (
				<div className="rounded-lg border bg-surface px-4 py-6 text-center">
					<p className="text-sm text-muted">
						No API keys yet. Generate one to get started.
					</p>
				</div>
			) : (
				<div className="overflow-hidden rounded-lg border">
					<table className="min-w-full text-sm">
						<thead className="bg-surface">
							<tr>
								<th className="px-4 py-2 text-left font-medium text-secondary">
									Label
								</th>
								<th className="px-4 py-2 text-left font-medium text-secondary">
									Created
								</th>
								<th className="px-4 py-2 text-right font-medium text-secondary">
									Actions
								</th>
							</tr>
						</thead>
						<tbody>
							{keys.map((key) => (
								<tr
									key={key.id}
									className="border-t"
								>
									<td className="px-4 py-3 text-primary font-medium">
										{key.label}
									</td>
									<td className="px-4 py-3 text-muted">
										{formatDate(key.createdAt)}
									</td>
									<td className="px-4 py-3 text-right">
										<button
											type="button"
											onClick={() => handleRevoke(key.id)}
											disabled={revokingId === key.id}
											className="text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-800 disabled:opacity-50 transition-colors"
										>
											{revokingId === key.id
												? 'Revoking...'
												: 'Revoke'}
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</section>
	)
}
