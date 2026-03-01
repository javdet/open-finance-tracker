import { describe, it, expect, beforeEach } from 'vitest'
import type { SmsParser, ParsedSms } from './index.js'
import {
	registerParser,
	findParser,
	listParsers,
	clearParsers,
} from './index.js'

function makeDummyParser(name: string, accepts: boolean): SmsParser {
	return {
		name,
		canParse: () => accepts,
		parse: (): ParsedSms => ({
			operationType: 'payment',
			amount: 100,
			currencyCode: 'THB',
		}),
	}
}

beforeEach(() => {
	clearParsers()
})

describe('parser registry', () => {
	it('starts with no parsers', () => {
		expect(listParsers()).toHaveLength(0)
	})

	it('registers and lists parsers', () => {
		registerParser(makeDummyParser('bank-a', true))
		registerParser(makeDummyParser('bank-b', false))

		const all = listParsers()
		expect(all).toHaveLength(2)
		expect(all.map((p) => p.name)).toEqual(['bank-a', 'bank-b'])
	})

	it('findParser returns the first matching parser', () => {
		registerParser(makeDummyParser('no-match', false))
		registerParser(makeDummyParser('match', true))
		registerParser(makeDummyParser('also-match', true))

		const found = findParser('X', 'Y')
		expect(found).toBeDefined()
		expect(found!.name).toBe('match')
	})

	it('findParser returns undefined when nothing matches', () => {
		registerParser(makeDummyParser('no-match', false))

		expect(findParser('X', 'Y')).toBeUndefined()
	})

	it('clearParsers removes all registered parsers', () => {
		registerParser(makeDummyParser('a', true))
		registerParser(makeDummyParser('b', true))
		expect(listParsers()).toHaveLength(2)

		clearParsers()
		expect(listParsers()).toHaveLength(0)
	})

	it('listParsers returns a copy (mutations do not affect registry)', () => {
		registerParser(makeDummyParser('original', true))

		const list = listParsers()
		expect(list).toHaveLength(1)

		;(list as SmsParser[]).push(makeDummyParser('injected', true))
		expect(listParsers()).toHaveLength(1)
	})
})
