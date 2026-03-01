import { useState, useEffect, useMemo, useCallback } from 'react'
import type { ScheduledTransaction } from '@/types'
import { fetchScheduledTransactions } from '@/api'
import { AddScheduledTransactionModal } from '@/pages/budget/AddScheduledTransactionModal'
import { useAuth } from '@/contexts/auth-context'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface CalendarDay {
	date: Date
	day: number
	isCurrentMonth: boolean
	isToday: boolean
	dateStr: string
}

/**
 * Compute which days of a given month/year a scheduled transaction
 * occurs on, based on its startDate and recurrencePeriod.
 * Returns an array of day-of-month numbers (1-based).
 */
export function getOccurrencesForMonth(
	tx: ScheduledTransaction,
	year: number,
	month: number,
): number[] {
	const start = new Date(tx.startDate + 'T00:00:00')
	const startYear = start.getFullYear()
	const startMonth = start.getMonth()
	const startDay = start.getDate()

	const daysInMonth = new Date(year, month + 1, 0).getDate()
	const firstOfMonth = new Date(year, month, 1)

	if (firstOfMonth < new Date(startYear, startMonth, 1) && !(
		year === startYear && month === startMonth
	)) {
		return []
	}

	const days: number[] = []

	switch (tx.recurrencePeriod) {
		case 'daily': {
			for (let d = 1; d <= daysInMonth; d++) {
				const current = new Date(year, month, d)
				if (current >= start) {
					days.push(d)
				}
			}
			break
		}

		case 'weekly': {
			const startTime = start.getTime()
			for (let d = 1; d <= daysInMonth; d++) {
				const current = new Date(year, month, d)
				if (current < start) continue
				const diffDays = Math.round(
					(current.getTime() - startTime) / (1000 * 60 * 60 * 24),
				)
				if (diffDays % 7 === 0) {
					days.push(d)
				}
			}
			break
		}

		case 'biweekly': {
			const startTime = start.getTime()
			for (let d = 1; d <= daysInMonth; d++) {
				const current = new Date(year, month, d)
				if (current < start) continue
				const diffDays = Math.round(
					(current.getTime() - startTime) / (1000 * 60 * 60 * 24),
				)
				if (diffDays % 14 === 0) {
					days.push(d)
				}
			}
			break
		}

		case 'monthly': {
			const current = new Date(year, month, 1)
			if (current < new Date(startYear, startMonth, 1)) break
			const targetDay = Math.min(startDay, daysInMonth)
			const targetDate = new Date(year, month, targetDay)
			if (targetDate >= start) {
				days.push(targetDay)
			}
			break
		}

		case 'quarterly': {
			const current = new Date(year, month, 1)
			if (current < new Date(startYear, startMonth, 1)) break
			const monthDiff = (year - startYear) * 12 + (month - startMonth)
			if (monthDiff >= 0 && monthDiff % 3 === 0) {
				const targetDay = Math.min(startDay, daysInMonth)
				const targetDate = new Date(year, month, targetDay)
				if (targetDate >= start) {
					days.push(targetDay)
				}
			}
			break
		}

		case 'yearly': {
			if (month !== startMonth) break
			if (year < startYear) break
			const targetDay = Math.min(startDay, daysInMonth)
			const targetDate = new Date(year, month, targetDay)
			if (targetDate >= start) {
				days.push(targetDay)
			}
			break
		}
	}

	return days
}

function buildCalendarDays(year: number, month: number): CalendarDay[] {
	const today = new Date()
	const todayStr = [
		today.getFullYear(),
		String(today.getMonth() + 1).padStart(2, '0'),
		String(today.getDate()).padStart(2, '0'),
	].join('-')

	const firstDay = new Date(year, month, 1)
	const daysInMonth = new Date(year, month + 1, 0).getDate()
	const startDow = firstDay.getDay()

	const prevMonthDays = new Date(year, month, 0).getDate()

	const cells: CalendarDay[] = []

	for (let i = startDow - 1; i >= 0; i--) {
		const d = prevMonthDays - i
		const date = new Date(year, month - 1, d)
		const dateStr = [
			date.getFullYear(),
			String(date.getMonth() + 1).padStart(2, '0'),
			String(d).padStart(2, '0'),
		].join('-')
		cells.push({
			date,
			day: d,
			isCurrentMonth: false,
			isToday: dateStr === todayStr,
			dateStr,
		})
	}

	for (let d = 1; d <= daysInMonth; d++) {
		const date = new Date(year, month, d)
		const dateStr = [
			year,
			String(month + 1).padStart(2, '0'),
			String(d).padStart(2, '0'),
		].join('-')
		cells.push({
			date,
			day: d,
			isCurrentMonth: true,
			isToday: dateStr === todayStr,
			dateStr,
		})
	}

	const remaining = 7 - (cells.length % 7)
	if (remaining < 7) {
		for (let d = 1; d <= remaining; d++) {
			const date = new Date(year, month + 1, d)
			const dateStr = [
				date.getFullYear(),
				String(date.getMonth() + 1).padStart(2, '0'),
				String(d).padStart(2, '0'),
			].join('-')
			cells.push({
				date,
				day: d,
				isCurrentMonth: false,
				isToday: dateStr === todayStr,
				dateStr,
			})
		}
	}

	return cells
}

function ChevronLeftIcon() {
	return (
		<svg
			className="w-5 h-5"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
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

const MONTH_NAMES = [
	'January', 'February', 'March', 'April',
	'May', 'June', 'July', 'August',
	'September', 'October', 'November', 'December',
]

interface ScheduledTransactionCalendarProps {
	isOpen: boolean
	onClose: () => void
}

export function ScheduledTransactionCalendar({
	isOpen,
	onClose,
}: ScheduledTransactionCalendarProps) {
	const { user } = useAuth()
	const today = new Date()
	const [year, setYear] = useState(today.getFullYear())
	const [month, setMonth] = useState(today.getMonth())
	const [transactions, setTransactions] = useState<ScheduledTransaction[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const [addModalDate, setAddModalDate] = useState<string | null>(null)

	const loadTransactions = useCallback(() => {
		setIsLoading(true)
		fetchScheduledTransactions(user?.userId ?? '')
			.then((data) => {
				setTransactions(data.filter((t) => t.isActive))
			})
			.catch(() => setTransactions([]))
			.finally(() => setIsLoading(false))
	}, [user?.userId])

	useEffect(() => {
		if (isOpen) {
			loadTransactions()
		}
	}, [isOpen, loadTransactions])

	const handlePrevMonth = useCallback(() => {
		setMonth((prev) => {
			if (prev === 0) {
				setYear((y) => y - 1)
				return 11
			}
			return prev - 1
		})
	}, [])

	const handleNextMonth = useCallback(() => {
		setMonth((prev) => {
			if (prev === 11) {
				setYear((y) => y + 1)
				return 0
			}
			return prev + 1
		})
	}, [])

	const handleToday = useCallback(() => {
		const now = new Date()
		setYear(now.getFullYear())
		setMonth(now.getMonth())
	}, [])

	const calendarDays = useMemo(
		() => buildCalendarDays(year, month),
		[year, month],
	)

	const occurrenceMap = useMemo(() => {
		const map = new Map<number, ScheduledTransaction[]>()
		for (const tx of transactions) {
			const days = getOccurrencesForMonth(tx, year, month)
			for (const day of days) {
				const existing = map.get(day) ?? []
				existing.push(tx)
				map.set(day, existing)
			}
		}
		return map
	}, [transactions, year, month])

	const handleDayClick = useCallback((dateStr: string) => {
		setAddModalDate(dateStr)
	}, [])

	const handleAddModalClose = useCallback(() => {
		setAddModalDate(null)
	}, [])

	const handleAddSuccess = useCallback(() => {
		loadTransactions()
	}, [loadTransactions])

	if (!isOpen) return null

	return (
		<>
			<div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
				<div
					className="absolute inset-0 bg-black/40 transition-opacity duration-200"
					onClick={onClose}
					aria-hidden="true"
				/>
				<div className="relative z-10 w-full max-w-3xl bg-white border border-gray-200 rounded-lg shadow-xl mx-4 transform transition-all duration-200 scale-100 animate-scale-in flex flex-col max-h-[90vh]">
					<header className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
						<h2 className="text-sm font-semibold tracking-wide text-gray-900 uppercase">
							Scheduled Transactions
						</h2>
						<button
							type="button"
							onClick={onClose}
							className="inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
							aria-label="Close"
						>
							✕
						</button>
					</header>

					<div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
						<button
							type="button"
							onClick={handlePrevMonth}
							className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
							aria-label="Previous month"
						>
							<ChevronLeftIcon />
						</button>
						<div className="flex items-center gap-3">
							<h3 className="text-base font-semibold text-gray-900">
								{MONTH_NAMES[month]} {year}
							</h3>
							<button
								type="button"
								onClick={handleToday}
								className="px-2 py-0.5 text-xs font-medium text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
							>
								Today
							</button>
						</div>
						<button
							type="button"
							onClick={handleNextMonth}
							className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
							aria-label="Next month"
						>
							<ChevronRightIcon />
						</button>
					</div>

					<div className="overflow-y-auto flex-1 px-3 pb-3 pt-1">
						{isLoading ? (
							<div className="flex items-center justify-center py-16 text-sm text-gray-500">
								Loading scheduled transactions...
							</div>
						) : (
							<div className="grid grid-cols-7 gap-px bg-gray-200 rounded-md overflow-hidden border border-gray-200">
								{DAY_LABELS.map((label) => (
									<div
										key={label}
										className="bg-gray-50 px-1 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider"
									>
										{label}
									</div>
								))}

								{calendarDays.map((cell, idx) => {
									const events = cell.isCurrentMonth
										? (occurrenceMap.get(cell.day) ?? [])
										: []

									return (
										<button
											key={idx}
											type="button"
											onClick={() => handleDayClick(cell.dateStr)}
											className={[
												'bg-white min-h-[72px] sm:min-h-[88px] p-1 text-left transition-colors hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-emerald-500',
												!cell.isCurrentMonth && 'bg-gray-50/50',
											]
												.filter(Boolean)
												.join(' ')}
										>
											<span
												className={[
													'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
													cell.isToday
														? 'bg-emerald-600 text-white'
														: cell.isCurrentMonth
															? 'text-gray-900'
															: 'text-gray-400',
												]
													.filter(Boolean)
													.join(' ')}
											>
												{cell.day}
											</span>
											<div className="mt-0.5 space-y-0.5 overflow-hidden">
												{events.slice(0, 3).map((tx) => (
													<div
														key={tx.id}
														className={[
															'rounded px-1 py-px text-[10px] leading-tight truncate',
															tx.operationType === 'payment'
																? 'bg-red-100 text-red-700'
																: 'bg-green-100 text-green-700',
														].join(' ')}
														title={`${tx.name} (${tx.recurrencePeriod})`}
													>
														{tx.name}
													</div>
												))}
												{events.length > 3 && (
													<div className="text-[10px] text-gray-400 px-1">
														+{events.length - 3} more
													</div>
												)}
											</div>
										</button>
									)
								})}
							</div>
						)}
					</div>
				</div>
			</div>

			<AddScheduledTransactionModal
				isOpen={addModalDate !== null}
				onClose={handleAddModalClose}
				onSuccess={handleAddSuccess}
				initialDate={addModalDate ?? undefined}
			/>
		</>
	)
}
