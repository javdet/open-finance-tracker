import { useState, useEffect, useCallback } from 'react'
import type { Category, CategoryGroup, CategoryType } from '@/types'
import {
	fetchCategories,
	fetchCategoryGroups,
	createCategory,
	updateCategory,
} from '@/api'
import { clsx } from '@/lib/clsx'

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

function getTypeDisplay(type: CategoryType): string {
	return type === 'income' ? 'Income' : 'Expense'
}

/** Value for "System category" dropdown: empty, "g-{groupId}", or "c-{categoryId}". */
function parseSystemCategoryValue(
	value: string,
): { groupId: string | null; parentCategoryId: string | null } {
	if (!value) return { groupId: null, parentCategoryId: null }
	if (value.startsWith('g-'))
		return { groupId: value.slice(2), parentCategoryId: null }
	if (value.startsWith('c-'))
		return { groupId: null, parentCategoryId: value.slice(2) }
	return { groupId: null, parentCategoryId: null }
}

interface AddCategoryModalProps {
	isOpen: boolean
	onClose: () => void
	onSuccess: () => void
	groups: CategoryGroup[]
	/** Top-level categories (no group, no parent) for use as system category. */
	systemCategories: Category[]
}

function AddCategoryModal({
	isOpen,
	onClose,
	onSuccess,
	groups,
	systemCategories,
}: AddCategoryModalProps) {
	const [name, setName] = useState('')
	const [type, setType] = useState<CategoryType>('expense')
	const [systemCategoryValue, setSystemCategoryValue] = useState<string>('')
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const resetForm = useCallback(() => {
		setName('')
		setType('expense')
		setSystemCategoryValue('')
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
			setError('Category name is required')
			return
		}
		setError(null)
		setIsSubmitting(true)
		const { groupId, parentCategoryId } = parseSystemCategoryValue(
			systemCategoryValue,
		)
		createCategory({
			name: trimmedName,
			type,
			groupId: groupId || null,
			parentCategoryId: parentCategoryId || null,
		})
			.then(() => {
				handleClose()
				onSuccess()
			})
			.catch((err: Error) => {
				setError(err.message || 'Failed to create category')
			})
			.finally(() => setIsSubmitting(false))
	}

	if (!isOpen) return null

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
						Add new category
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
							htmlFor="category-name"
							className="block text-xs font-medium text-gray-700 mb-1"
						>
							Category name <span className="text-red-500">*</span>
						</label>
						<input
							id="category-name"
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g. Food"
							className="block w-full rounded border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
							autoFocus
						/>
					</div>
					<div>
						<label
							htmlFor="category-type"
							className="block text-xs font-medium text-gray-700 mb-1"
						>
							Type
						</label>
						<select
							id="category-type"
							value={type}
							onChange={(e) =>
								setType(e.target.value as CategoryType)
							}
							className="block w-full rounded border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
						>
							<option value="expense">Expense</option>
							<option value="income">Income</option>
						</select>
					</div>
					<div>
						<label
							htmlFor="category-group"
							className="block text-xs font-medium text-gray-700 mb-1"
						>
							System category
						</label>
						<select
							id="category-group"
							value={systemCategoryValue}
							onChange={(e) =>
								setSystemCategoryValue(e.target.value)
							}
							className="block w-full rounded border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
						>
							<option value="">— None —</option>
							{groups
								.filter(
									(g) =>
										g.direction === type ||
										g.direction === 'both',
								)
								.map((g) => (
									<option key={`g-${g.id}`} value={`g-${g.id}`}>
										{g.name}
									</option>
								))}
							{systemCategories
								.filter((c) => c.type === type)
								.sort((a, b) => a.name.localeCompare(b.name))
								.map((c) => (
									<option key={`c-${c.id}`} value={`c-${c.id}`}>
										{c.name}
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

interface EditCategoryModalProps {
	isOpen: boolean
	onClose: () => void
	onSuccess: () => void
	category: Category | null
	groups: CategoryGroup[]
	/** Top-level categories (no group, no parent) for use as system category. */
	systemCategories: Category[]
}

function EditCategoryModal({
	isOpen,
	onClose,
	onSuccess,
	category,
	groups,
	systemCategories,
}: EditCategoryModalProps) {
	const [name, setName] = useState('')
	const [type, setType] = useState<CategoryType>('expense')
	const [systemCategoryValue, setSystemCategoryValue] = useState<string>('')
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		if (category) {
			setName(category.name)
			setType(category.type)
			setSystemCategoryValue(
				category.groupId
					? `g-${category.groupId}`
					: category.parentCategoryId
						? `c-${category.parentCategoryId}`
						: '',
			)
			setError(null)
		}
	}, [category])

	const handleClose = useCallback(() => {
		setError(null)
		onClose()
	}, [onClose])

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (!category) return
		const trimmedName = name.trim()
		if (!trimmedName) {
			setError('Category name is required')
			return
		}
		setError(null)
		setIsSubmitting(true)
		const { groupId, parentCategoryId } = parseSystemCategoryValue(
			systemCategoryValue,
		)
		updateCategory(
			category.id,
			{
				name: trimmedName,
				type,
				groupId: groupId || null,
				parentCategoryId: parentCategoryId || null,
			},
		)
			.then(() => {
				handleClose()
				onSuccess()
			})
			.catch((err: Error) => {
				setError(err.message || 'Failed to update category')
			})
			.finally(() => setIsSubmitting(false))
	}

	if (!isOpen || !category) return null

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
						Edit category
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
							htmlFor="edit-category-name"
							className="block text-xs font-medium text-gray-700 mb-1"
						>
							Category name <span className="text-red-500">*</span>
						</label>
						<input
							id="edit-category-name"
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							className="block w-full rounded border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
							autoFocus
						/>
					</div>
					<div>
						<label
							htmlFor="edit-category-type"
							className="block text-xs font-medium text-gray-700 mb-1"
						>
							Type
						</label>
						<select
							id="edit-category-type"
							value={type}
							onChange={(e) =>
								setType(e.target.value as CategoryType)
							}
							className="block w-full rounded border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
						>
							<option value="expense">Expense</option>
							<option value="income">Income</option>
						</select>
					</div>
					<div>
						<label
							htmlFor="edit-category-group"
							className="block text-xs font-medium text-gray-700 mb-1"
						>
							System category
						</label>
						<select
							id="edit-category-group"
							value={systemCategoryValue}
							onChange={(e) =>
								setSystemCategoryValue(e.target.value)
							}
							className="block w-full rounded border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
						>
							<option value="">— None —</option>
							{groups
								.filter(
									(g) =>
										g.direction === type ||
										g.direction === 'both',
								)
								.map((g) => (
									<option key={`g-${g.id}`} value={`g-${g.id}`}>
										{g.name}
									</option>
								))}
							{systemCategories
								.filter(
									(c) =>
										c.type === type && c.id !== category.id,
								)
								.sort((a, b) => a.name.localeCompare(b.name))
								.map((c) => (
									<option key={`c-${c.id}`} value={`c-${c.id}`}>
										{c.name}
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

type TypeSortOrder = 'asc' | 'desc' | null

function cycleTypeSort(current: TypeSortOrder): TypeSortOrder {
	if (current === null) return 'asc'
	if (current === 'asc') return 'desc'
	return null
}

export function CategoriesPage() {
	const [categories, setCategories] = useState<Category[]>([])
	const [groups, setGroups] = useState<CategoryGroup[]>([])
	const [error, setError] = useState<string | null>(null)
	const [isAddModalOpen, setIsAddModalOpen] = useState(false)
	const [editingCategory, setEditingCategory] = useState<Category | null>(null)
	const [typeSortOrder, setTypeSortOrder] = useState<TypeSortOrder>(null)
	const [expandedSystemCategoryIds, setExpandedSystemCategoryIds] = useState<
		string[]
	>([])

	function loadCategories() {
		fetchCategories()
			.then(setCategories)
			.catch((err: Error) => setError(err.message))
	}

	function loadGroups() {
		fetchCategoryGroups()
			.then(setGroups)
			.catch(() => {})
	}

	useEffect(() => {
		loadCategories()
		loadGroups()
	}, [])

	// Expand all top-level categories on initial load only (not when user clicks "Collapse all")
	useEffect(() => {
		const initialIds = categories
			.filter((c) => !c.groupId && !c.parentCategoryId)
			.map((c) => c.id)
		if (initialIds.length > 0) {
			setExpandedSystemCategoryIds(initialIds)
		}
	}, [categories])

	const handleAddSuccess = useCallback(() => {
		loadCategories()
		setIsAddModalOpen(false)
	}, [])

	const handleDelete = (categoryId: string) => {
		// TODO: Implement delete (API + soft/hard delete)
		console.log('Delete category:', categoryId)
	}

	const handleAddNew = () => {
		setIsAddModalOpen(true)
	}

	const handleEdit = (category: Category) => {
		setEditingCategory(category)
	}

	const handleEditSuccess = useCallback(() => {
		loadCategories()
		setEditingCategory(null)
	}, [])

	const handleToggleSystemCategory = useCallback((categoryId: string) => {
		setExpandedSystemCategoryIds((prev) =>
			prev.includes(categoryId)
				? prev.filter((id) => id !== categoryId)
				: [...prev, categoryId],
		)
	}, [])

	function getGroupName(id: string | null): string {
		if (!id) return '—'
		const g = groups.find((x) => x.id === id)
		return g?.name ?? '—'
	}

	function getSystemCategoryDisplay(category: Category): string {
		if (category.parentCategoryId) {
			const parent = categories.find(
				(c) => c.id === category.parentCategoryId,
			)
			return parent?.name ?? '—'
		}
		if (category.groupId) return getGroupName(category.groupId)
		return category.name
	}

	// Top-level system categories (no group, no parent) — shown in "System category" dropdown
	const systemCategories = categories.filter(
		(c) => !c.groupId && !c.parentCategoryId,
	)
	const systemCategoryIds = new Set(systemCategories.map((c) => c.id))
	// Hierarchy: system categories first, then their children, then categories by group
	const categoriesByGroup = categories.filter((c) => c.groupId)
	const categoriesByParent = categories.filter((c) => c.parentCategoryId)
	const childrenByParentId = categoriesByParent.reduce<
		Record<string, Category[]>
	>((acc, cat) => {
		if (!cat.parentCategoryId) return acc
		if (!acc[cat.parentCategoryId]) acc[cat.parentCategoryId] = []
		acc[cat.parentCategoryId].push(cat)
		return acc
	}, {})
	const groupedByGroupId = groups
		.slice()
		.sort((a, b) => a.name.localeCompare(b.name))
		.map((g) => ({
			group: g,
			items: categoriesByGroup
				.filter((c) => c.groupId === g.id)
				.sort((a, b) => a.name.localeCompare(b.name)),
		}))
	const orderedCategories: Category[] = []
	const topLevel = systemCategories
		.slice()
		.sort((a, b) => a.name.localeCompare(b.name))
	topLevel.forEach((parent) => {
		orderedCategories.push(parent)
		orderedCategories.push(
			...categoriesByParent
				.filter((c) => c.parentCategoryId === parent.id)
				.sort((a, b) => a.name.localeCompare(b.name)),
		)
	})
	groupedByGroupId.forEach(({ items }) => {
		orderedCategories.push(...items)
	})

	const sortedCategories =
		typeSortOrder === null
			? orderedCategories
			: [...orderedCategories].sort((a, b) => {
					const order = typeSortOrder === 'asc' ? 1 : -1
					return order * (a.type === b.type ? 0 : a.type === 'expense' ? -1 : 1)
				})

	const handleTypeHeaderClick = useCallback(() => {
		setTypeSortOrder((prev) => cycleTypeSort(prev))
	}, [])

	const allSystemCategoriesExpanded =
		systemCategoryIds.size > 0 &&
		systemCategoryIds.size === expandedSystemCategoryIds.length &&
		[...systemCategoryIds].every((id) =>
			expandedSystemCategoryIds.includes(id),
		)

	function handleCollapseExpandAll() {
		if (allSystemCategoriesExpanded) {
			setExpandedSystemCategoryIds([])
		} else {
			setExpandedSystemCategoryIds([...systemCategoryIds])
		}
	}

	return (
		<div className="flex flex-col h-full space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-semibold text-gray-900">
					Categories
				</h2>
				<div className="flex items-center gap-3">
					{systemCategoryIds.size > 0 && (
						<button
							type="button"
							onClick={handleCollapseExpandAll}
							className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
						>
							{allSystemCategoriesExpanded
								? 'Collapse all'
								: 'Expand all'}
						</button>
					)}
					<button
						type="button"
						onClick={handleAddNew}
						className="px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 active:scale-95 transition-all duration-150 shadow-sm hover:shadow"
					>
						+ Add Category
					</button>
				</div>
			</div>
			{error && (
				<div className="rounded-md bg-red-50 border border-red-200 px-4 py-3">
					<p className="text-sm text-red-600">{error}</p>
				</div>
			)}
			<div className="flex-1 overflow-hidden rounded-md border border-gray-200 bg-white">
				<div className="max-h-[calc(100vh-220px)] overflow-auto">
					<table className="min-w-full border-collapse text-sm">
						<thead className="bg-gray-50 sticky top-0 z-10">
							<tr className="text-left text-gray-600">
								<th className="border-b border-gray-200 px-4 py-2 font-medium">
									Category
								</th>
								<th className="border-b border-gray-200 px-4 py-2 font-medium">
									<button
										type="button"
										onClick={handleTypeHeaderClick}
										className={clsx(
											'flex items-center gap-1 outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 rounded',
											typeSortOrder != null && 'text-emerald-700',
										)}
										title={
											typeSortOrder === null
												? 'Click to sort by type'
												: `Sorted by type (${typeSortOrder === 'asc' ? 'Expense first' : 'Income first'}). Click to change.`
										}
									>
										Type
										{typeSortOrder === 'asc' && (
											<span className="text-emerald-600" aria-hidden>↑</span>
										)}
										{typeSortOrder === 'desc' && (
											<span className="text-emerald-600" aria-hidden>↓</span>
										)}
									</button>
								</th>
								<th className="border-b border-gray-200 px-4 py-2 font-medium">
									System Category
								</th>
								<th className="border-b border-gray-200 px-4 py-2 w-24 font-medium">
									{/* Actions */}
								</th>
							</tr>
						</thead>
						<tbody>
							{sortedCategories.length === 0 && !error && (
								<tr>
									<td
										colSpan={4}
										className="px-4 py-8 text-center text-gray-500"
									>
										No categories yet. Click &quot;+ Add Category&quot; to get
										started.
									</td>
								</tr>
							)}
							{sortedCategories.map((category) => {
								const isChild =
									!!category.groupId ||
									!!category.parentCategoryId

								const parentId = category.parentCategoryId
								const isChildOfSystem =
									!!parentId &&
									systemCategoryIds.has(parentId)
								const isParentCollapsed =
									isChildOfSystem &&
									!expandedSystemCategoryIds.includes(
										parentId,
									)
								if (isParentCollapsed) {
									return null
								}

								const isTopLevelSystem =
									!category.groupId &&
									!category.parentCategoryId
								const hasChildren =
									!!childrenByParentId[category.id]?.length

								return (
									<tr
										key={category.id}
										className={clsx(
											'border-b border-gray-100 transition-colors',
											isTopLevelSystem
												? 'bg-gray-100 hover:bg-gray-200/70'
												: 'hover:bg-gray-50',
										)}
										onClick={() => {
											if (isTopLevelSystem && hasChildren) {
												handleToggleSystemCategory(
													category.id,
												)
											}
										}}
									>
										<td className="px-4 py-3 align-top text-gray-800">
											<div
												className={clsx(
													'flex items-center gap-1',
													isChild ? 'pl-6' : '',
												)}
											>
												{isTopLevelSystem &&
													hasChildren && (
														<button
															type="button"
															onClick={(e) => {
																e.stopPropagation()
																handleToggleSystemCategory(
																	category.id,
																)
															}}
															className="inline-flex h-5 w-5 items-center justify-center rounded border border-gray-300 bg-white text-[10px] leading-none text-gray-600 mr-1"
															aria-label={
																expandedSystemCategoryIds.includes(
																	category.id,
																)
																	? 'Collapse nested categories'
																	: 'Expand nested categories'
															}
														>
															{expandedSystemCategoryIds.includes(
																category.id,
															)
																? '−'
																: '+'}
														</button>
													)}
												<span className={isTopLevelSystem ? 'font-semibold' : ''}>
													{category.name}
												</span>
											</div>
										</td>
										<td className="px-4 py-3 align-top">
											<span
												className={clsx(
													'font-medium',
													category.type === 'expense'
														? 'text-red-600'
														: 'text-emerald-600',
												)}
											>
												{getTypeDisplay(category.type)}
											</span>
										</td>
										<td className="px-4 py-3 align-top text-gray-800">
											{getSystemCategoryDisplay(category)}
										</td>
										<td className="px-4 py-3 align-top">
											<div className="flex items-center gap-1">
												<button
													type="button"
													onClick={(e) => {
														e.stopPropagation()
														handleEdit(category)
													}}
													className="text-gray-400 hover:text-emerald-600 transition-colors p-1 rounded"
													aria-label="Edit category"
												>
													<PencilIcon />
												</button>
												<button
													type="button"
													onClick={(e) => {
														e.stopPropagation()
														handleDelete(
															category.id,
														)
													}}
													className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded disabled:opacity-50"
													aria-label="Delete category"
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
			</div>
			<AddCategoryModal
				isOpen={isAddModalOpen}
				onClose={() => setIsAddModalOpen(false)}
				onSuccess={handleAddSuccess}
				groups={groups}
				systemCategories={systemCategories}
			/>
			<EditCategoryModal
				isOpen={editingCategory != null}
				onClose={() => setEditingCategory(null)}
				onSuccess={handleEditSuccess}
				category={editingCategory}
				groups={groups}
				systemCategories={systemCategories}
			/>
		</div>
	)
}
