/**
 * Fetches exchange rates from the Frankfurter API and caches them in the
 * exchange_rates table. Used by the budget-vs-actual report to convert
 * operation amounts to the budget's base currency.
 */
import { getPool } from '../db/client.js'
import type pg from 'pg'

const FRANKFURTER_BASE_URL = 'https://api.frankfurter.dev/v1'

/**
 * Ensure exchange rates exist in the DB for the given date and base currency.
 * If the exact date has no cached rates, fetches from Frankfurter and stores
 * them. Frankfurter automatically returns the nearest previous business-day
 * rates when a weekend or holiday date is requested.
 */
export async function ensureRatesForDate(
	baseCurrency: string,
	date: string,
	pool?: pg.Pool,
): Promise<void> {
	const client = pool ?? getPool()

	// Frankfurter may return the nearest business day, so check for any rate
	// within a 5-day window of the requested date (covers weekends/holidays).
	const existing = await client.query(
		`SELECT 1 FROM exchange_rates
		 WHERE base_currency_code = $1
		   AND rate_date BETWEEN ($2::date - INTERVAL '5 days') AND ($2::date + INTERVAL '1 day')
		 LIMIT 1`,
		[baseCurrency, date],
	)

	if (existing.rows.length > 0) {
		return
	}

	try {
		// Load the set of currency codes that our DB knows about so we only
		// insert rates for currencies that satisfy the foreign-key constraint.
		const knownCurrenciesResult = await client.query<{ code: string }>(
			'SELECT code FROM currencies',
		)
		const knownCurrencies = new Set(
			knownCurrenciesResult.rows.map((r) => r.code),
		)

		const url = `${FRANKFURTER_BASE_URL}/${date}?base=${encodeURIComponent(baseCurrency)}`
		const response = await fetch(url)
		if (!response.ok) {
			console.error(
				'Frankfurter fetch failed:',
				response.status,
				response.statusText,
			)
			return
		}

		const data = (await response.json()) as {
			base: string
			date: string
			rates: Record<string, number>
		}

		// Filter to only currencies that exist in our currencies table
		const entries = Object.entries(data.rates).filter(
			([currency]) => knownCurrencies.has(currency),
		)
		if (entries.length === 0) return

		const values: string[] = []
		const params: (string | number)[] = []
		let idx = 1

		for (const [currency, rate] of entries) {
			values.push(
				`($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3})`,
			)
			params.push(data.date, baseCurrency, currency, rate)
			idx += 4
		}

		await client.query(
			`INSERT INTO exchange_rates
			   (rate_date, base_currency_code, counter_currency_code, rate)
			 VALUES ${values.join(', ')}
			 ON CONFLICT (rate_date, base_currency_code, counter_currency_code)
			 DO NOTHING`,
			params,
		)
	} catch (err) {
		console.error('ensureRatesForDate error:', err)
	}
}
