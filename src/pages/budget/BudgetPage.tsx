import { useState, useEffect, useCallback } from 'react'
import type { Budget, BudgetVsActualReport } from '@/types'
import {
	findOrCreateMonthlyBudget,
	fetchBudgetVsActualReport,
} from '@/api/budgets'
import { IncomeSection } from './IncomeSection'

const DEFAULT_USER_ID = '1'

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
	const now = new Date()
	const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1)
	const [currentYear, setCurrentYear] = useState(now.getFullYear())
	const [budget, setBudget] = useState<Budget | null>(null)
	const [report, setReport] = useState<BudgetVsActualReport | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(true)

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

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-semibold text-gray-900">Budget</h2>
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
				<IncomeSection
					budgetId={budget.id}
					report={report}
					onRefresh={handleRefresh}
				/>
			) : null}
		</div>
	)
}
