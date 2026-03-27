import { useState, useEffect, useCallback, useMemo } from 'react'
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
} from 'recharts'
import { fetchBalanceHistory } from '@/api'
import type { AccountMeta, BalanceHistoryPoint } from '@/api'

const BASE_CURRENCY = 'USD'
const DEFAULT_DAYS = 30

const ACCOUNT_COLORS = [
	'#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
	'#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
]

function formatDateLabel(dateStr: string): string {
	const d = new Date(dateStr + 'T00:00:00')
	return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatMoney(amount: number): string {
	try {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: BASE_CURRENCY,
			minimumFractionDigits: 0,
			maximumFractionDigits: 2,
		}).format(amount)
	} catch {
		return `$${amount.toFixed(2)}`
	}
}

interface ChartDataPoint {
	date: string
	[key: string]: string | number
}

export interface BalanceHistoryChartProps {
	baseCurrency?: string
	days?: number
}

export function BalanceHistoryChart({
	baseCurrency = BASE_CURRENCY,
	days = DEFAULT_DAYS,
}: BalanceHistoryChartProps) {
	const [points, setPoints] = useState<BalanceHistoryPoint[]>([])
	const [accounts, setAccounts] = useState<AccountMeta[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	const loadData = useCallback(() => {
		setIsLoading(true)
		setError(null)
		fetchBalanceHistory(baseCurrency, days)
			.then((res) => {
				setPoints(res.points)
				setAccounts(res.accounts)
			})
			.catch((err: Error) => {
				setError(err.message ?? 'Failed to load balance history')
				setPoints([])
				setAccounts([])
			})
			.finally(() => setIsLoading(false))
	}, [baseCurrency, days])

	useEffect(() => {
		loadData()
	}, [loadData])

	const chartData = useMemo<ChartDataPoint[]>(() =>
		points.map((p) => {
			const row: ChartDataPoint = { date: p.date }
			for (const acc of accounts) {
				row[acc.id] = p.accountBalances[acc.id] ?? 0
			}
			return row
		}),
	[points, accounts],
	)

	if (error) {
		return (
			<div className="rounded-md bg-red-50 border border-red-200 px-4 py-3">
				<p className="text-sm text-red-600">{error}</p>
			</div>
		)
	}

	if (isLoading) {
		return (
			<div
				className="flex items-center justify-center text-gray-500 text-sm"
				style={{ minHeight: 300 }}
			>
				Loading balance history...
			</div>
		)
	}

	if (points.length === 0) {
		return (
			<div
				className="flex items-center justify-center text-gray-500 text-sm"
				style={{ minHeight: 300 }}
				role="status"
				aria-live="polite"
			>
				No balance history available.
			</div>
		)
	}

	const nameById = new Map(accounts.map((a) => [a.id, a.name]))

	return (
		<div className="flex flex-col">
			<div
				className="sr-only"
				role="status"
				aria-live="polite"
			>
				Balance history from {formatDateLabel(points[0].date)} to{' '}
				{formatDateLabel(points[points.length - 1].date)}.
				{accounts.map((a) => {
					const latest = points[points.length - 1].accountBalances[a.id] ?? 0
					return ` ${a.name}: ${formatMoney(latest)}.`
				})}
			</div>
			<div style={{ height: 340, width: '100%' }}>
				<ResponsiveContainer width="100%" height="100%">
					<LineChart
						data={chartData}
						margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
					>
						<CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
						<XAxis
							dataKey="date"
							tickFormatter={formatDateLabel}
							tick={{ fontSize: 12, fill: '#6b7280' }}
							tickLine={false}
							axisLine={{ stroke: '#d1d5db' }}
							interval="preserveStartEnd"
						/>
						<YAxis
							tickFormatter={(v: number) => formatMoney(v)}
							tick={{ fontSize: 12, fill: '#6b7280' }}
							tickLine={false}
							axisLine={{ stroke: '#d1d5db' }}
							width={80}
						/>
						<Tooltip
							formatter={(value: number, _name: string, props: { dataKey?: string | number }) => {
								const key = String(props.dataKey ?? '')
								const name = nameById.get(key) ?? key
								return [formatMoney(value), name]
							}}
							labelFormatter={formatDateLabel}
							contentStyle={{
								borderRadius: '8px',
								border: '1px solid #e5e7eb',
								fontSize: '14px',
							}}
						/>
						<Legend
							formatter={(value: string) => nameById.get(value) ?? value}
							wrapperStyle={{ fontSize: '13px' }}
						/>
						{accounts.map((acc, i) => (
							<Line
								key={acc.id}
								type="monotone"
								dataKey={acc.id}
								name={acc.id}
								stroke={ACCOUNT_COLORS[i % ACCOUNT_COLORS.length]}
								strokeWidth={2}
								dot={false}
								activeDot={{
									r: 5,
									fill: ACCOUNT_COLORS[i % ACCOUNT_COLORS.length],
									stroke: '#fff',
									strokeWidth: 2,
								}}
							/>
						))}
					</LineChart>
				</ResponsiveContainer>
			</div>
		</div>
	)
}
