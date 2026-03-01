import { useState, useEffect, useCallback, useRef } from 'react'
import {
	PieChart,
	Pie,
	Cell,
	ResponsiveContainer,
	Tooltip,
	LabelList,
} from 'recharts'
import { fetchCategoryTotalsInBase, fetchCategories } from '@/api'

const BASE_CURRENCY = 'USD'

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

export function getMonthOptions(): Array<{ month: number; year: number; label: string }> {
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

export interface CategoryChartDataItem {
	name: string
	value: number
	categoryId: string | null
	percentage: number
}

export interface CategoryChartProps {
	title: string
	operationType: 'payment' | 'income'
	selectedMonth: number
	selectedYear: number
	emptyMessage?: string
}

export function CategoryChart({
	title,
	operationType,
	selectedMonth,
	selectedYear,
	emptyMessage,
}: CategoryChartProps) {
	const [chartData, setChartData] = useState<CategoryChartDataItem[]>([])
	const [totalAmount, setTotalAmount] = useState(0)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	const loadData = useCallback(() => {
		setIsLoading(true)
		setError(null)
		const { fromTime, toTime } = getMonthRange(selectedMonth, selectedYear)
		const opts = {}
		const categoryType = operationType === 'payment' ? 'expense' : 'income'
		Promise.all([
			fetchCategoryTotalsInBase(
				{
					fromTime,
					toTime,
					operationType,
					baseCurrencyCode: BASE_CURRENCY,
				},
				opts,
			),
			fetchCategories(opts),
		])
			.then(([totalsRes, categories]) => {
				const typeCategories = new Map<string, string>()
				categories
					.filter((c) => c.type === categoryType)
					.forEach((c) => typeCategories.set(c.id, c.name))
				const total = totalsRes.rows.reduce((s, r) => s + r.actualAmount, 0)
				const data: CategoryChartDataItem[] = totalsRes.rows
					.filter((r) => r.actualAmount > 0)
					.map((r) => ({
						name: r.categoryId
							? typeCategories.get(r.categoryId) ?? 'Unknown'
							: 'Uncategorized',
						value: r.actualAmount,
						categoryId: r.categoryId,
						percentage: total > 0 ? (r.actualAmount / total) * 100 : 0,
					}))
					.sort((a, b) => b.value - a.value)
				setChartData(data)
				setTotalAmount(total)
			})
			.catch((err: Error) => {
				setError(err.message ?? `Failed to load ${title.toLowerCase()}`)
				setChartData([])
				setTotalAmount(0)
			})
			.finally(() => setIsLoading(false))
	}, [selectedMonth, selectedYear, operationType, title])

	useEffect(() => {
		loadData()
	}, [loadData])

	const defaultEmpty =
		operationType === 'payment'
			? 'No expenses for this month.'
			: 'No revenue for this month.'
	const emptyMsg = emptyMessage ?? defaultEmpty

	return (
		<div className="flex flex-col">
			{error && (
				<div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 mb-3">
					<p className="text-sm text-red-600">{error}</p>
				</div>
			)}

			{isLoading ? (
				<div
					className="flex items-center justify-center text-gray-500 text-sm"
					style={{ minHeight: 280 }}
				>
					Loading...
				</div>
			) : chartData.length === 0 ? (
				<div
					className="flex items-center justify-center text-gray-500 text-sm"
					style={{ minHeight: 280 }}
					role="status"
					aria-live="polite"
				>
					{emptyMsg}
				</div>
			) : (
				<>
					<div
						className="sr-only"
						role="status"
						aria-live="polite"
					>
						{title} total {formatMoney(totalAmount, BASE_CURRENCY)}.
						{chartData.map(
							(item) =>
								` ${item.name}: ${item.percentage.toFixed(1)}%.`,
						)}
					</div>
					<div className="relative" style={{ height: 280 }}>
						<ResponsiveContainer width="100%" height="100%">
							<PieChart>
								<Pie
									data={chartData}
									dataKey="value"
									nameKey="name"
									cx="50%"
									cy="50%"
									innerRadius="52%"
									outerRadius="82%"
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
										formatter={(
											_value: number,
											_name: string,
											props: { payload?: CategoryChartDataItem },
										) => {
											const payload = props?.payload
											if (!payload) return ''
											return `${payload.name}: ${payload.percentage.toFixed(0)}%`
										}}
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
							<span className="text-sm font-medium text-gray-600">
								{title}
							</span>
							<span className="text-xl font-bold text-gray-800 mt-1">
								{formatMoney(totalAmount, BASE_CURRENCY)}
							</span>
						</div>
					</div>
				</>
			)}
		</div>
	)
}

export function ExpenseChart() {
	const now = new Date()
	const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
	const [selectedYear, setSelectedYear] = useState(now.getFullYear())
	const [isMonthOpen, setIsMonthOpen] = useState(false)
	const monthDropdownRef = useRef<HTMLDivElement>(null)
	const monthOptions = getMonthOptions()

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
		<div className="flex flex-col">
			<div className="relative inline-flex self-end mb-2" ref={monthDropdownRef}>
				<button
					type="button"
					onClick={() => setIsMonthOpen((o) => !o)}
					className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
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
			<CategoryChart
				title="Expenses"
				operationType="payment"
				selectedMonth={selectedMonth}
				selectedYear={selectedYear}
			/>
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
