/**
 * Shared currency-conversion helpers used by budget-vs-actual,
 * balance-history, and any other service that needs to convert
 * multi-currency balances into a single base currency.
 */
import type { Pool } from 'pg'

/**
 * Converts a single amount from one currency to a base currency using
 * the provided rate map.  Stablecoins (USDC / USDT) are treated as 1:1
 * with USD (and with each other).
 */
export function toBase(
	amount: number,
	currencyCode: string,
	baseCurrency: string,
	rateByCurrency: Map<string, number>,
): number {
	if (currencyCode === baseCurrency) return amount
	const stablecoinPair =
		(baseCurrency === 'USD' && ['USDC', 'USDT'].includes(currencyCode)) ||
		(currencyCode === 'USD' && ['USDC', 'USDT'].includes(baseCurrency)) ||
		(['USDC', 'USDT'].includes(baseCurrency) &&
			['USDC', 'USDT'].includes(currencyCode))
	if (stablecoinPair) return amount
	const rate = rateByCurrency.get(currencyCode)
	if (!rate) return 0
	return amount / rate
}

/**
 * Converts an array of per-account balances (possibly in different
 * currencies) into a single sum expressed in `baseCurrency`.
 * Fetches the latest exchange rates on or before `rateDate`.
 */
export async function sumAccountBalancesInBase(
	balances: { currencyCode: string; balance: number }[],
	baseCurrency: string,
	rateDate: string,
	pool: Pool,
): Promise<number> {
	if (balances.length === 0) return 0
	const currencies = [...new Set(balances.map((b) => b.currencyCode))]
	const needsRates = currencies.some((c) => c !== baseCurrency)
	const rateByCurrency = new Map<string, number>()
	if (needsRates) {
		const rates = await pool.query<{
			counter_currency_code: string
			rate: string
		}>(
			`SELECT DISTINCT ON (counter_currency_code) counter_currency_code, rate
			 FROM exchange_rates
			 WHERE base_currency_code = $1 AND counter_currency_code = ANY($2)
			   AND rate_date <= $3::date
			 ORDER BY counter_currency_code, rate_date DESC`,
			[baseCurrency, currencies, rateDate],
		)
		for (const r of rates.rows) {
			if (!rateByCurrency.has(r.counter_currency_code)) {
				rateByCurrency.set(r.counter_currency_code, Number(r.rate))
			}
		}
	}
	let total = 0
	for (const { currencyCode, balance } of balances) {
		if (balance === 0) continue
		total += toBase(balance, currencyCode, baseCurrency, rateByCurrency)
	}
	return total
}

/**
 * Converts an array of per-account balances into individual amounts in
 * `baseCurrency`, returning a map of accountId → converted balance.
 */
export async function convertAccountBalancesInBase(
	balances: { id: string; currencyCode: string; balance: number }[],
	baseCurrency: string,
	rateDate: string,
	pool: Pool,
): Promise<Map<string, number>> {
	const result = new Map<string, number>()
	if (balances.length === 0) return result
	const currencies = [...new Set(balances.map((b) => b.currencyCode))]
	const needsRates = currencies.some((c) => c !== baseCurrency)
	const rateByCurrency = new Map<string, number>()
	if (needsRates) {
		const rates = await pool.query<{
			counter_currency_code: string
			rate: string
		}>(
			`SELECT DISTINCT ON (counter_currency_code) counter_currency_code, rate
			 FROM exchange_rates
			 WHERE base_currency_code = $1 AND counter_currency_code = ANY($2)
			   AND rate_date <= $3::date
			 ORDER BY counter_currency_code, rate_date DESC`,
			[baseCurrency, currencies, rateDate],
		)
		for (const r of rates.rows) {
			if (!rateByCurrency.has(r.counter_currency_code)) {
				rateByCurrency.set(r.counter_currency_code, Number(r.rate))
			}
		}
	}
	for (const { id, currencyCode, balance } of balances) {
		const converted = balance === 0
			? 0
			: toBase(balance, currencyCode, baseCurrency, rateByCurrency)
		result.set(id, Math.round(converted * 100) / 100)
	}
	return result
}
