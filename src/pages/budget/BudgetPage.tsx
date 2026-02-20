import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Budget, BudgetTemplate, BudgetVsActualReport } from '@/types'
import {
	findOrCreateMonthlyBudget,
	fetchBudgetVsActualReport,
} from '@/api/budgets'
import {
	fetchTemplates,
	applyTemplate,
} from '@/api/budget-templates'
import { IncomeSection } from './IncomeSection'
import { ExpenseSection } from './ExpenseSection'
import { clsx } from '@/lib/clsx'

const DEFAULT_USER_ID = '1'

function formatMoney(amount: number, currencyCode: string): string {
	try {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: currencyCode,
			minimumFractionDigits: 0,
			maximumFractionDigits: 2,
		}).format(amount)
	} catch {
		const formatted = new Intl.NumberFormat('en-US', {
			minimumFractionDigits: 0,
			maximumFractionDigits: 2,
		}).format(amount)
		return `${formatted} ${currencyCode}`
	}
}

interface BalanceSummaryProps {
	report: BudgetVsActualReport
}

function BalanceSummary({ report }: BalanceSummaryProps) {
	const {
		incomeTotalPlanned,
		incomeTotalActual,
		expenseTotalPlanned,
		expenseTotalActual,
		baseCurrencyCode,
	} = report

	const plannedBalance = incomeTotalPlanned - expenseTotalPlanned
	const actualBalance = incomeTotalActual - expenseTotalActual
	const difference = actualBalance - plannedBalance

	return (
		<div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
			<h3 className="text-base font-semibold text-gray-900 mb-4">
				Balance Summary
			</h3>
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<div
					className={clsx(
						'rounded-lg p-4 border',
						plannedBalance >= 0
							? 'bg-emerald-50 border-emerald-200'
							: 'bg-red-50 border-red-200',
					)}
				>
					<p className="text-sm font-medium text-gray-600 mb-1">
						Planned Balance
					</p>
					<p className="text-xs text-gray-500 mb-2">
						Income {formatMoney(incomeTotalPlanned, baseCurrencyCode)}
						{' \u2212 '}
						Expenses {formatMoney(expenseTotalPlanned, baseCurrencyCode)}
					</p>
					<p
						className={clsx(
							'text-2xl font-bold',
							plannedBalance >= 0
								? 'text-emerald-700'
								: 'text-red-700',
						)}
					>
						{formatMoney(plannedBalance, baseCurrencyCode)}
					</p>
				</div>
				<div
					className={clsx(
						'rounded-lg p-4 border',
						actualBalance >= 0
							? 'bg-emerald-50 border-emerald-200'
							: 'bg-red-50 border-red-200',
					)}
				>
					<p className="text-sm font-medium text-gray-600 mb-1">
						Actual Balance
					</p>
					<p className="text-xs text-gray-500 mb-2">
						Income {formatMoney(incomeTotalActual, baseCurrencyCode)}
						{' \u2212 '}
						Expenses {formatMoney(expenseTotalActual, baseCurrencyCode)}
					</p>
					<p
						className={clsx(
							'text-2xl font-bold',
							actualBalance >= 0
								? 'text-emerald-700'
								: 'text-red-700',
						)}
					>
						{formatMoney(actualBalance, baseCurrencyCode)}
					</p>
				</div>
				<div
					className={clsx(
						'rounded-lg p-4 border',
						difference > 0
							? 'bg-emerald-50 border-emerald-200'
							: difference < 0
								? 'bg-red-50 border-red-200'
								: 'bg-gray-50 border-gray-200',
					)}
				>
					<p className="text-sm font-medium text-gray-600 mb-1">
						Difference
					</p>
					<p className="text-xs text-gray-500 mb-2">
						Actual − Planned
					</p>
					<p
						className={clsx(
							'text-2xl font-bold',
							difference > 0
								? 'text-emerald-700'
								: difference < 0
									? 'text-red-700'
									: 'text-gray-700',
						)}
					>
						{difference >= 0 ? '+' : ''}
						{formatMoney(difference, baseCurrencyCode)}
					</p>
				</div>
			</div>
		</div>
	)
}

const MONTH_NAMES = [
	'JANUARY',
	'FEBRUARY',
	'MARCH',
	'APRIL',
	'MAY',
	'JUNE',
	'JULY',
	'AUGUST',
	'SEPTEMBER',
	'OCTOBER',
	'NOVEMBER',
	'DECEMBER',
]

function ChevronLeftIcon() {
	return (
		<svg
			className="w-5 h-5"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
				d="M15 19l-7-7 7-7"
			/>
		</svg>
	)
}

function ChevronRightIcon() {
	return (
		<svg
			className="w-5 h-5"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
				d="M9 5l7 7-7 7"
			/>
		</svg>
	)
}

export function BudgetPage() {
	const navigate = useNavigate()
	const now = new Date()
	const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1)
	const [currentYear, setCurrentYear] = useState(now.getFullYear())
	const [budget, setBudget] = useState<Budget | null>(null)
	const [report, setReport] = useState<BudgetVsActualReport | null>(null)
	const [templates, setTemplates] = useState<BudgetTemplate[]>([])
	const [error, setError] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [applySuccess, setApplySuccess] = useState(false)

	useEffect(() => {
		fetchTemplates({ userId: DEFAULT_USER_ID })
			.then(setTemplates)
			.catch(() => setTemplates([]))
	}, [])

	const loadBudget = useCallback(async () => {
		setIsLoading(true)
		setError(null)
		try {
			const budgetData = await findOrCreateMonthlyBudget(
				currentMonth,
				currentYear,
				'USD',
				{ userId: DEFAULT_USER_ID },
			)
			setBudget(budgetData)
			const reportData = await fetchBudgetVsActualReport(budgetData.id, {
				userId: DEFAULT_USER_ID,
			})
			setReport(reportData)
		} catch (err) {
			setError((err as Error).message || 'Failed to load budget')
			setBudget(null)
			setReport(null)
		} finally {
			setIsLoading(false)
		}
	}, [currentMonth, currentYear])

	useEffect(() => {
		loadBudget()
	}, [loadBudget])

	function handlePreviousMonth() {
		if (currentMonth === 1) {
			setCurrentMonth(12)
			setCurrentYear(currentYear - 1)
		} else {
			setCurrentMonth(currentMonth - 1)
		}
	}

	function handleNextMonth() {
		if (currentMonth === 12) {
			setCurrentMonth(1)
			setCurrentYear(currentYear + 1)
		} else {
			setCurrentMonth(currentMonth + 1)
		}
	}

	function handleRefresh() {
		loadBudget()
	}

	function handleTemplateSelect(value: string) {
		if (value === '__create__') {
			navigate('/budget/templates/new')
			return
		}
		if (value) {
			navigate(`/budget/templates/${value}`)
		}
	}

	async function handleApplyTemplate(templateId: string) {
		if (!templateId) return
		setError(null)
		try {
			await applyTemplate(templateId, currentMonth, currentYear, {
				userId: DEFAULT_USER_ID,
			})
			await loadBudget()
			setApplySuccess(true)
			setTimeout(() => setApplySuccess(false), 2000)
		} catch (err) {
			setError((err as Error).message || 'Failed to apply template')
		}
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<h2 className="text-xl font-semibold text-gray-900">Budget</h2>
				<div className="flex flex-wrap items-center gap-3">
					<div className="flex flex-col gap-1">
						<label htmlFor="budget-template-select" className="text-xs text-gray-500">
							Template
						</label>
						<select
							id="budget-template-select"
							value=""
							onChange={(e) => handleTemplateSelect(e.target.value)}
							className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
							aria-label="Select or create template"
						>
							<option value="">Select...</option>
							<option value="__create__">Create template</option>
							{templates.map((t) => (
								<option key={t.id} value={t.id}>
									{t.name}
								</option>
							))}
						</select>
					</div>
					<div className="flex flex-col gap-1">
						<label htmlFor="budget-apply-template-select" className="text-xs text-gray-500">
							Apply template
						</label>
						<select
							id="budget-apply-template-select"
							value=""
							onChange={(e) => {
								const v = e.target.value
								if (v) handleApplyTemplate(v)
								e.target.value = ''
							}}
							className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
							aria-label="Apply template to current month"
						>
							<option value="">Select...</option>
							{templates.map((t) => (
								<option key={t.id} value={t.id}>
									{t.name}
								</option>
							))}
						</select>
					</div>
				</div>
			</div>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<button
						type="button"
						onClick={handlePreviousMonth}
						className="p-1.5 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
						aria-label="Previous month"
					>
						<ChevronLeftIcon />
					</button>
					<div className="text-lg font-semibold text-gray-900 min-w-[180px] text-center">
						{MONTH_NAMES[currentMonth - 1]} {currentYear}
					</div>
					<button
						type="button"
						onClick={handleNextMonth}
						className="p-1.5 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
						aria-label="Next month"
					>
						<ChevronRightIcon />
					</button>
				</div>
				{applySuccess && (
					<p className="text-sm text-emerald-600 font-medium">
						Template applied.
					</p>
				)}
			</div>

			{error && (
				<div className="rounded-md bg-red-50 border border-red-200 px-4 py-3">
					<p className="text-sm text-red-600">{error}</p>
				</div>
			)}

		{isLoading ? (
			<div className="text-sm text-gray-500 py-8 text-center">
				Loading budget...
			</div>
		) : budget ? (
			<>
				<IncomeSection
					budgetId={budget.id}
					report={report}
					onRefresh={handleRefresh}
				/>
				<ExpenseSection
					budgetId={budget.id}
					report={report}
					onRefresh={handleRefresh}
				/>
				{report && <BalanceSummary report={report} />}
			</>
		) : null}
		</div>
	)
}
