import { useState, useEffect, useCallback } from 'react'
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
} from 'recharts'
import { fetchBalanceHistory } from '@/api'
import type { BalanceHistoryPoint } from '@/api'

const BASE_CURRENCY = 'USD'
const DEFAULT_DAYS = 30

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

export interface BalanceHistoryChartProps {
	baseCurrency?: string
	days?: number
}

export function BalanceHistoryChart({
	baseCurrency = BASE_CURRENCY,
	days = DEFAULT_DAYS,
}: BalanceHistoryChartProps) {
	const [data, setData] = useState<BalanceHistoryPoint[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	const loadData = useCallback(() => {
		setIsLoading(true)
		setError(null)
		fetchBalanceHistory(baseCurrency, days)
			.then((res) => setData(res.points))
			.catch((err: Error) => {
				setError(err.message ?? 'Failed to load balance history')
				setData([])
			})
			.finally(() => setIsLoading(false))
	}, [baseCurrency, days])

	useEffect(() => {
		loadData()
	}, [loadData])

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

	if (data.length === 0) {
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

	return (
		<div className="flex flex-col">
			<div
				className="sr-only"
				role="status"
				aria-live="polite"
			>
				Balance history from {formatDateLabel(data[0].date)} to{' '}
				{formatDateLabel(data[data.length - 1].date)}.
				Latest balance: {formatMoney(data[data.length - 1].totalBalance)}.
			</div>
			<div style={{ height: 300, width: '100%' }}>
				<ResponsiveContainer width="100%" height="100%">
					<LineChart
						data={data}
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
							formatter={(value: number) => [
								formatMoney(value),
								'Total Balance',
							]}
							labelFormatter={formatDateLabel}
							contentStyle={{
								borderRadius: '8px',
								border: '1px solid #e5e7eb',
								fontSize: '14px',
							}}
						/>
						<Line
							type="monotone"
							dataKey="totalBalance"
							stroke="#3b82f6"
							strokeWidth={2}
							dot={false}
							activeDot={{ r: 5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
						/>
					</LineChart>
				</ResponsiveContainer>
			</div>
		</div>
	)
}
