import { describe, it, expect } from 'vitest'
import { getMonthlyEquivalent } from './scheduled-transactions.js'
import type { RecurrencePeriod } from './scheduled-transactions.js'

describe('getMonthlyEquivalent', () => {
	const cases: [RecurrencePeriod, number][] = [
		['daily', 30],
		['weekly', 4.33],
		['biweekly', 2.17],
		['monthly', 1],
		['quarterly', 1 / 3],
		['yearly', 1 / 12],
	]

	it.each(cases)(
		'multiplies by the correct factor for %s recurrence',
		(period, expectedMultiplier) => {
			const amount = 120
			const result = getMonthlyEquivalent(amount, period)
			expect(result).toBeCloseTo(amount * expectedMultiplier, 2)
		},
	)

	it('returns 0 for zero amount regardless of period', () => {
		for (const period of ['daily', 'weekly', 'monthly', 'yearly'] as RecurrencePeriod[]) {
			expect(getMonthlyEquivalent(0, period)).toBe(0)
		}
	})

	it('handles negative amounts', () => {
		expect(getMonthlyEquivalent(-100, 'daily')).toBeCloseTo(-3000, 2)
		expect(getMonthlyEquivalent(-60, 'monthly')).toBe(-60)
		expect(getMonthlyEquivalent(-1200, 'yearly')).toBeCloseTo(-100, 2)
	})

	it('handles fractional amounts', () => {
		expect(getMonthlyEquivalent(0.5, 'daily')).toBeCloseTo(15, 2)
		expect(getMonthlyEquivalent(9.99, 'monthly')).toBe(9.99)
	})
})
