import { useState, useEffect, useCallback, useRef } from 'react'
import {
	PieChart,
	Pie,
	Cell,
	ResponsiveContainer,
	Tooltip,
	LabelList,
} from 'recharts'
import type { Operation } from '@/types'
import { fetchOperations, fetchCategories } from '@/api'

const DEFAULT_USER_ID = '1'
const BASE_CURRENCY = 'USD'
const OPERATIONS_LIMIT = 2000

const MONTH_NAMES = [
	'January', 'February', 'March', 'April', 'May', 'June',
	'July', 'August', 'September', 'October', 'November', 'December',
]

const CATEGORY_COLORS = [
	'#3b82f6', '#a78bfa', '#22c55e', '#f97316', '#ec4899', '#eab308',
	'#06b6d4', '#8b5cf6', '#84cc16', '#ef4444',
]

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

function getMonthRange(month: number, year: number): { fromTime: string; toTime: string } {
	const firstDay = new Date(year, month - 1, 1, 0, 0, 0, 0)
	const lastDay = new Date(year, month, 0, 23, 59, 59, 999)
	return {
		fromTime: firstDay.toISOString(),
		toTime: lastDay.toISOString(),
	}
}

function getMonthOptions(): Array<{ month: number; year: number; label: string }> {
	const now = new Date()
	const options: Array<{ month: number; year: number; label: string }> = []
	options.push({
		month: now.getMonth() + 1,
		year: now.getFullYear(),
		label: 'This Month',
	})
	for (let i = 1; i <= 11; i++) {
		const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
		options.push({
			month: d.getMonth() + 1,
			year: d.getFullYear(),
			label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
		})
	}
	return options
}

export interface ExpenseChartDataItem {
	name: string
	value: number
	categoryId: string | null
	percentage: number
}

export function ExpenseChart() {
	const now = new Date()
	const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
	const [selectedYear, setSelectedYear] = useState(now.getFullYear())
	const [chartData, setChartData] = useState<ExpenseChartDataItem[]>([])
	const [totalAmount, setTotalAmount] = useState(0)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [isMonthOpen, setIsMonthOpen] = useState(false)
	const monthDropdownRef = useRef<HTMLDivElement>(null)

	const monthOptions = getMonthOptions()

	const loadData = useCallback(() => {
		setIsLoading(true)
		setError(null)
		const { fromTime, toTime } = getMonthRange(selectedMonth, selectedYear)
		const opts = { userId: DEFAULT_USER_ID }
		Promise.all([
			fetchOperations(
				{
					userId: DEFAULT_USER_ID,
					fromTime,
					toTime,
					operationType: 'payment',
					limit: OPERATIONS_LIMIT,
				},
				opts,
			),
			fetchCategories(opts),
		])
			.then(([opsRes, categories]) => {
				const expenseCategories = new Map<string, string>()
				categories
					.filter((c) => c.type === 'expense')
					.forEach((c) => expenseCategories.set(c.id, c.name))
				const byCategory = new Map<string | null, number>()
				opsRes.rows.forEach((op: Operation) => {
					const amount = op.amountInBase ?? op.amount
					const key = op.categoryId ?? null
					byCategory.set(key, (byCategory.get(key) ?? 0) + amount)
				})
				const total = Array.from(byCategory.values()).reduce((s, v) => s + v, 0)
				const data: ExpenseChartDataItem[] = Array.from(byCategory.entries())
					.filter(([, value]) => value > 0)
					.map(([categoryId, value]) => ({
						name: categoryId
							? expenseCategories.get(categoryId) ?? 'Unknown'
							: 'Uncategorized',
						value,
						categoryId,
						percentage: total > 0 ? (value / total) * 100 : 0,
					}))
					.sort((a, b) => b.value - a.value)
				setChartData(data)
				setTotalAmount(total)
			})
			.catch((err: Error) => {
				setError(err.message ?? 'Failed to load expenses')
				setChartData([])
				setTotalAmount(0)
			})
			.finally(() => setIsLoading(false))
	}, [selectedMonth, selectedYear])

	useEffect(() => {
		loadData()
	}, [loadData])

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
		<div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-base font-semibold text-gray-900">
					Expense chart
				</h3>
				<div className="relative" ref={monthDropdownRef}>
					<button
						type="button"
						onClick={() => setIsMonthOpen((o) => !o)}
						className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
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

			{error && (
				<div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 mb-4">
					<p className="text-sm text-red-600">{error}</p>
				</div>
			)}

			{isLoading ? (
				<div className="flex items-center justify-center h-80 text-gray-500 text-sm">
					Loading...
				</div>
			) : chartData.length === 0 ? (
				<div
					className="flex items-center justify-center h-80 text-gray-500 text-sm"
					role="status"
					aria-live="polite"
				>
					No expenses for this month.
				</div>
			) : (
				<>
					<div
						className="sr-only"
						role="status"
						aria-live="polite"
					>
						Total expenses {formatMoney(totalAmount, BASE_CURRENCY)}.
						{chartData.map(
							(item) =>
								` ${item.name}: ${item.percentage.toFixed(1)}%.`,
						)}
					</div>
					<div className="relative" style={{ height: 320 }}>
						<ResponsiveContainer width="100%" height="100%">
							<PieChart>
								<Pie
									data={chartData}
									dataKey="value"
									nameKey="name"
									cx="50%"
									cy="50%"
									innerRadius="55%"
									outerRadius="85%"
									paddingAngle={1}
									stroke="none"
									labelLine
								>
									{chartData.map((_, index) => (
										<Cell
											key={chartData[index].name + chartData[index].categoryId}
											fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
										/>
									))}
									<LabelList
										position="outside"
										formatter={(_value: number, _name: string, props: { payload: ExpenseChartDataItem }) =>
											`${props.payload.name}: ${props.payload.percentage.toFixed(0)}%`
										}
										className="text-sm fill-gray-600"
									/>
								</Pie>
								<Tooltip
									formatter={(value: number) => formatMoney(value, BASE_CURRENCY)}
									contentStyle={{
										borderRadius: '8px',
										border: '1px solid #e5e7eb',
									}}
								/>
							</PieChart>
						</ResponsiveContainer>
						<div
							className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
							aria-hidden="true"
						>
							<span className="text-2xl font-bold text-gray-800">
								{formatMoney(totalAmount, BASE_CURRENCY)}
							</span>
							<span className="text-sm text-gray-500 mt-0.5">
								Total Amount
							</span>
						</div>
					</div>
				</>
			)}
		</div>
	)
}

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
