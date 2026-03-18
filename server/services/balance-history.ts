/**
 * Computes daily aggregate account balances in a single base currency
 * over the last N days.  Used by the balance-history chart on the dashboard.
 */
import type { Pool } from 'pg'
import { getPool } from '../db/client.js'
import { listAccountBalancesAtDate } from '../repositories/accounts.js'
import { ensureRatesForDate } from './exchange-rate-cache.js'
import { sumAccountBalancesInBase } from './currency-conversion.js'

export interface BalanceHistoryPoint {
	date: string
	totalBalance: number
}

export interface BalanceHistoryResult {
	points: BalanceHistoryPoint[]
}

/**
 * Returns one data point per day for the last `days` days (plus today),
 * each containing the sum of all active account balances converted to
 * `baseCurrency` using the closest available exchange rate.
 */
export async function getBalanceHistory(
	userId: string,
	baseCurrency = 'USD',
	days = 30,
): Promise<BalanceHistoryResult> {
	const pool = getPool()
	const dates = generateDatePoints(days)

	const uniqueDates = [...new Set(dates.map((d) => d.dateStr))]
	await Promise.all(
		uniqueDates.map((d) => ensureRatesForDate(baseCurrency, d, pool)),
	)

	const points = await Promise.all(
		dates.map((d) =>
			computeDayBalance(userId, d.dateStr, d.asOfTime, baseCurrency, pool),
		),
	)

	return { points }
}

/**
 * Generates an array of date strings from `days` ago through today (inclusive),
 * each at 00:00:00 UTC of the following day so that the full day's operations
 * are included.
 */
function generateDatePoints(days: number): { dateStr: string; asOfTime: string }[] {
	const result: { dateStr: string; asOfTime: string }[] = []
	const now = new Date()

	for (let i = days; i >= 0; i--) {
		const d = new Date(
			Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i),
		)
		const dateStr = d.toISOString().slice(0, 10)

		const nextDay = new Date(d)
		nextDay.setUTCDate(nextDay.getUTCDate() + 1)
		const asOfTime = nextDay.toISOString()

		result.push({ dateStr, asOfTime })
	}

	return result
}

async function computeDayBalance(
	userId: string,
	dateStr: string,
	asOfTime: string,
	baseCurrency: string,
	pool: Pool,
): Promise<BalanceHistoryPoint> {
	const balances = await listAccountBalancesAtDate(userId, asOfTime, pool)
	const totalBalance = await sumAccountBalancesInBase(
		balances,
		baseCurrency,
		dateStr,
		pool,
	)
	return { date: dateStr, totalBalance: Math.round(totalBalance * 100) / 100 }
}
