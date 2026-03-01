import { describe, it, expect } from 'vitest'
import { clsx } from './clsx'

describe('clsx', () => {
	it('combines multiple class strings', () => {
		expect(clsx('a', 'b', 'c')).toBe('a b c')
	})

	it('filters out undefined values', () => {
		expect(clsx('a', undefined, 'b')).toBe('a b')
	})

	it('filters out false values', () => {
		expect(clsx('a', false, 'b')).toBe('a b')
	})

	it('filters out empty strings', () => {
		expect(clsx('a', '', 'b')).toBe('a b')
	})

	it('handles a mix of falsy values', () => {
		expect(clsx(undefined, 'x', false, '', 'y', undefined)).toBe('x y')
	})

	it('returns empty string when all inputs are falsy', () => {
		expect(clsx(undefined, false, '')).toBe('')
	})

	it('returns empty string when called with no arguments', () => {
		expect(clsx()).toBe('')
	})

	it('returns the single class when only one is provided', () => {
		expect(clsx('only')).toBe('only')
	})
})
