import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import type { BudgetTemplate } from '@/types'
import {
	fetchTemplateById,
	createTemplate,
	updateTemplate,
} from '@/api/budget-templates'
import { TemplateSection } from './TemplateSection'

export function BudgetTemplateEditorPage() {
	const { id } = useParams<'id'>()
	const navigate = useNavigate()
	const isNew = id === undefined || id === 'new'

	const [template, setTemplate] = useState<BudgetTemplate | null>(null)
	const [name, setName] = useState('')
	const [baseCurrencyCode, setBaseCurrencyCode] = useState('USD')
	const [error, setError] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(!isNew)
	const [isSaving, setIsSaving] = useState(false)

	const loadTemplate = useCallback(async () => {
		if (!id || isNew) return
		setIsLoading(true)
		setError(null)
		try {
			const data = await fetchTemplateById(id)
			setTemplate(data)
			setName(data.name)
			setBaseCurrencyCode(data.baseCurrencyCode)
		} catch (err) {
			setError((err as Error).message || 'Failed to load template')
			setTemplate(null)
		} finally {
			setIsLoading(false)
		}
	}, [id, isNew])

	useEffect(() => {
		if (!isNew && id) {
			loadTemplate()
		} else {
			setIsLoading(false)
		}
	}, [isNew, id, loadTemplate])

	async function handleCreateTemplate(e: React.FormEvent) {
		e.preventDefault()
		const trimmedName = name.trim()
		if (!trimmedName) {
			setError('Template name is required')
			return
		}
		setError(null)
		setIsSaving(true)
		try {
			const created = await createTemplate({
				name: trimmedName,
				baseCurrencyCode: baseCurrencyCode || 'USD',
			})
			navigate(`/budget/templates/${created.id}`, { replace: true })
		} catch (err) {
			setError((err as Error).message || 'Failed to create template')
		} finally {
			setIsSaving(false)
		}
	}

	async function handleSaveName() {
		if (!template || !id) return
		const trimmedName = name.trim()
		if (!trimmedName) {
			setError('Template name is required')
			return
		}
		if (trimmedName === template.name) return
		setError(null)
		setIsSaving(true)
		try {
			const updated = await updateTemplate(id, {
				name: trimmedName,
				baseCurrencyCode: baseCurrencyCode || 'USD',
			})
			setTemplate(updated)
		} catch (err) {
			setError((err as Error).message || 'Failed to update template')
		} finally {
			setIsSaving(false)
		}
	}

	function handleRefresh() {
		if (template) {
			fetchTemplateById(template.id)
				.then(setTemplate)
				.catch(() => {})
		}
	}

	if (isNew) {
		return (
			<div className="space-y-6">
				<div className="flex items-center gap-3">
					<Link
						to="/budget"
						className="text-sm font-medium text-secondary hover:text-primary"
					>
						← Back to Budget
					</Link>
				</div>
				<h2 className="text-xl font-semibold text-primary">
					Create template
				</h2>
				{error && (
					<div className="rounded-md bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 px-4 py-3">
						<p className="text-sm text-red-600 dark:text-red-400">{error}</p>
					</div>
				)}
				<form onSubmit={handleCreateTemplate} className="max-w-md space-y-4">
					<div>
						<label
							htmlFor="template-name-new"
							className="block text-sm font-medium text-secondary mb-1"
						>
							Template name <span className="text-red-500">*</span>
						</label>
						<input
							id="template-name-new"
							type="text"
							value={name}
							onChange={(e) => {
								setName(e.target.value)
								setError(null)
							}}
							placeholder="e.g. Default monthly"
							className="block w-full rounded-md border border-strong bg-surface-card text-primary px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
						/>
					</div>
					<div>
						<label
							htmlFor="template-currency-new"
							className="block text-sm font-medium text-secondary mb-1"
						>
							Base currency
						</label>
						<input
							id="template-currency-new"
							type="text"
							value={baseCurrencyCode}
							onChange={(e) =>
								setBaseCurrencyCode(e.target.value.toUpperCase().slice(0, 10))
							}
							className="block w-full rounded-md border border-strong bg-surface-card text-primary px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
						/>
					</div>
					<div className="flex gap-2">
						<button
							type="submit"
							disabled={isSaving}
							className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50"
						>
							{isSaving ? 'Creating...' : 'Create template'}
						</button>
						<Link
							to="/budget"
							className="px-4 py-2 text-sm font-medium text-secondary bg-surface-card border border-strong rounded-md hover:bg-surface-hover"
						>
							Cancel
						</Link>
					</div>
				</form>
			</div>
		)
	}

	if (isLoading) {
		return (
			<div className="space-y-6">
				<Link
					to="/budget"
					className="text-sm font-medium text-secondary hover:text-primary"
				>
					← Back to Budget
				</Link>
				<div className="text-sm text-muted py-8">Loading template...</div>
			</div>
		)
	}

	if (!template) {
		return (
			<div className="space-y-6">
				<Link
					to="/budget"
					className="text-sm font-medium text-secondary hover:text-primary"
				>
					← Back to Budget
				</Link>
				{error && (
					<div className="rounded-md bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 px-4 py-3">
						<p className="text-sm text-red-600 dark:text-red-400">{error}</p>
					</div>
				)}
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3">
				<Link
					to="/budget"
					className="text-sm font-medium text-secondary hover:text-primary"
				>
					← Back to Budget
				</Link>
			</div>
			<div className="flex flex-col gap-2">
				<label
					htmlFor="template-name-edit"
					className="text-xs font-medium text-muted"
				>
					Template name
				</label>
				<div className="flex flex-wrap items-center gap-2">
					<input
						id="template-name-edit"
						type="text"
						value={name}
						onChange={(e) => {
							setName(e.target.value)
							setError(null)
						}}
						onBlur={handleSaveName}
						disabled={isSaving}
						className="rounded-md border border-strong bg-surface-card text-primary px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-70 max-w-md"
					/>
					<input
						type="text"
						value={baseCurrencyCode}
						onChange={(e) =>
							setBaseCurrencyCode(e.target.value.toUpperCase().slice(0, 10))
						}
						onBlur={handleSaveName}
						disabled={isSaving}
						className="w-20 rounded-md border border-strong bg-surface-card text-primary px-2 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-70"
						title="Base currency"
					/>
				</div>
			</div>
			{error && (
				<div className="rounded-md bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 px-4 py-3">
					<p className="text-sm text-red-600 dark:text-red-400">{error}</p>
				</div>
			)}
			<TemplateSection
				templateId={template.id}
				direction="income"
				currencyCode={template.baseCurrencyCode}
				onRefresh={handleRefresh}
			/>
			<TemplateSection
				templateId={template.id}
				direction="expense"
				currencyCode={template.baseCurrencyCode}
				onRefresh={handleRefresh}
			/>
		</div>
	)
}
