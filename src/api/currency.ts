/**
 * API client for currency exchange rates.
 *
 * Proxies the backend `/api/exchange-rates/latest` endpoint, which in turn
 * calls the external Frankfurter API and normalizes the response shape.
 */
import { get } from './client'

export interface ExchangeRatesResponse {
	base: string
	date: string
	rates: Record<string, number>
}

export function fetchLatestExchangeRates(
	base: string,
	symbols: string[],
): Promise<ExchangeRatesResponse> {
	const params = new URLSearchParams()
	if (base) params.set('base', base)
	if (symbols.length > 0) {
		params.set('symbols', symbols.join(','))
	}
	const query = params.toString()
	const path = query
		? `/api/exchange-rates/latest?${query}`
		: '/api/exchange-rates/latest'

	return get<ExchangeRatesResponse>(path)
}

