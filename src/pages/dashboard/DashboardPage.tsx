import { useState, useEffect, useRef, useCallback } from 'react'
import {
	CategoryChart,
	getMonthOptions,
} from '@/components/expense-chart/expense-chart'
import { PlanVsActualScale } from '@/components/plan-vs-actual-scale/plan-vs-actual-scale'
import { BalanceHistoryChart } from '@/components/balance-history-chart/balance-history-chart'
import {
	findOrCreateMonthlyBudget,
	fetchBudgetVsActualReport,
} from '@/api/budgets'
import type { BudgetVsActualReport } from '@/types'

const MONTH_NAMES = [
	'January', 'February', 'March', 'April', 'May', 'June',
	'July', 'August', 'September', 'October', 'November', 'December',
]

function CalendarIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
				d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
			/>
		</svg>
	)
}

function ChevronDownIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
				d="M19 9l-7 7-7-7"
			/>
		</svg>
	)
}

export function DashboardPage() {
	const now = new Date()
	const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
	const [selectedYear, setSelectedYear] = useState(now.getFullYear())
	const [isMonthOpen, setIsMonthOpen] = useState(false)
	const monthDropdownRef = useRef<HTMLDivElement>(null)
	const monthOptions = getMonthOptions()

	const [showBalanceHistory, setShowBalanceHistory] = useState(false)

	const [planVsActualReport, setPlanVsActualReport] =
		useState<BudgetVsActualReport | null>(null)
	const [planVsActualLoading, setPlanVsActualLoading] = useState(false)
	const [planVsActualError, setPlanVsActualError] = useState<string | null>(null)

	const loadPlanVsActual = useCallback(async () => {
		setPlanVsActualLoading(true)
		setPlanVsActualError(null)
		try {
			const budget = await findOrCreateMonthlyBudget(
				selectedMonth,
				selectedYear,
				'USD',
			)
			const report = await fetchBudgetVsActualReport(budget.id)
			setPlanVsActualReport(report)
		} catch (err) {
			setPlanVsActualError((err as Error).message ?? 'Failed to load plan vs actual')
			setPlanVsActualReport(null)
		} finally {
			setPlanVsActualLoading(false)
		}
	}, [selectedMonth, selectedYear])

	useEffect(() => {
		loadPlanVsActual()
	}, [loadPlanVsActual])

	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (
				monthDropdownRef.current &&
				!monthDropdownRef.current.contains(event.target as Node)
			) {
				setIsMonthOpen(false)
			}
		}
		if (isMonthOpen) {
			document.addEventListener('mousedown', handleClickOutside)
			return () => document.removeEventListener('mousedown', handleClickOutside)
		}
	}, [isMonthOpen])

	const currentLabel =
		selectedMonth === now.getMonth() + 1 && selectedYear === now.getFullYear()
			? 'This Month'
			: `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h2 className="text-xl font-semibold text-gray-900">Dashboard</h2>
				<div className="relative" ref={monthDropdownRef}>
					<button
						type="button"
						onClick={() => setIsMonthOpen((o) => !o)}
						className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
						aria-label="Select month"
						aria-expanded={isMonthOpen}
						aria-haspopup="listbox"
					>
						<CalendarIcon className="w-4 h-4 text-gray-500" />
						<span>{currentLabel}</span>
						<ChevronDownIcon className="w-4 h-4 text-gray-500" />
					</button>
					{isMonthOpen && (
						<ul
							role="listbox"
							className="absolute right-0 top-full z-10 mt-1 max-h-60 w-48 overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
						>
							{monthOptions.map((opt) => (
								<li
									key={`${opt.year}-${opt.month}`}
									role="option"
									aria-selected={
										opt.month === selectedMonth && opt.year === selectedYear
									}
									className="cursor-pointer px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
									onClick={() => {
										setSelectedMonth(opt.month)
										setSelectedYear(opt.year)
										setIsMonthOpen(false)
									}}
								>
									{opt.label}
								</li>
							))}
						</ul>
					)}
				</div>
			</div>

			<div className="grid md:grid-cols-2 gap-6">
				<CategoryChart
					title="Expenses"
					operationType="payment"
					selectedMonth={selectedMonth}
					selectedYear={selectedYear}
				/>
				<CategoryChart
					title="Revenue"
					operationType="income"
					selectedMonth={selectedMonth}
					selectedYear={selectedYear}
				/>
			</div>

			<section aria-labelledby="balance-history-heading">
				<button
					type="button"
					id="balance-history-heading"
					onClick={() => setShowBalanceHistory((v) => !v)}
					className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded"
					aria-expanded={showBalanceHistory}
				>
					{showBalanceHistory ? 'Hide Balance Changes' : 'Balance Changes'}
				</button>
				{showBalanceHistory && (
					<div className="mt-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
						<BalanceHistoryChart />
					</div>
				)}
			</section>

			<section aria-labelledby="plan-vs-actual-heading">
				<h2
					id="plan-vs-actual-heading"
					className="text-lg font-semibold text-gray-900 mb-3"
				>
					Plan vs actual
				</h2>
				{planVsActualError && (
					<div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 mb-3">
						<p className="text-sm text-red-600">{planVsActualError}</p>
					</div>
				)}
				{planVsActualLoading ? (
					<div
						className="flex items-center justify-center text-gray-500 text-sm rounded-lg border border-gray-200 bg-white py-12"
						style={{ minHeight: 220 }}
					>
						Loading plan vs actual...
					</div>
				) : planVsActualReport ? (
					<div className="grid sm:grid-cols-3 gap-4">
						<PlanVsActualScale
							title="Spending (expenses)"
							plan={planVsActualReport.expenseTotalPlanned}
							actual={planVsActualReport.expenseTotalActual}
							currencyCode={planVsActualReport.baseCurrencyCode}
							showUsage
						/>
						<PlanVsActualScale
							title="Income"
							plan={planVsActualReport.incomeTotalPlanned}
							actual={planVsActualReport.incomeTotalActual}
							currencyCode={planVsActualReport.baseCurrencyCode}
						/>
						<PlanVsActualScale
							title="Balance (income − expenses)"
							plan={
								planVsActualReport.incomeTotalPlanned -
								planVsActualReport.expenseTotalPlanned
							}
							actual={
								planVsActualReport.incomeTotalActual -
								planVsActualReport.expenseTotalActual
							}
							currencyCode={planVsActualReport.baseCurrencyCode}
							signed
						/>
					</div>
				) : null}
			</section>
		</div>
	)
}
