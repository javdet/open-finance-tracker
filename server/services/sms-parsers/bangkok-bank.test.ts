import { describe, it, expect } from 'vitest'
import { bangkokBankParser } from './bangkok-bank.js'

describe('bangkokBankParser.canParse', () => {
	it('matches sender containing "BANGKOKBANK"', () => {
		expect(bangkokBankParser.canParse('BANGKOKBANK', 'anything')).toBe(true)
	})

	it('matches sender containing "BBL"', () => {
		expect(bangkokBankParser.canParse('BBL', 'anything')).toBe(true)
	})

	it('matches sender "Bangkok Bank" (case-insensitive)', () => {
		expect(bangkokBankParser.canParse('Bangkok Bank', 'anything')).toBe(true)
	})

	it('matches message starting with "BBL:"', () => {
		expect(bangkokBankParser.canParse(
			'UNKNOWN',
			'BBL: card *1234 used THB 100.00',
		)).toBe(true)
	})

	it('matches message starting with "BANGKOKBANK:" (case-insensitive)', () => {
		expect(bangkokBankParser.canParse(
			'12345',
			'BangkokBank: Acct *5678 debit THB 500.00',
		)).toBe(true)
	})

	it('rejects unknown sender and message', () => {
		expect(bangkokBankParser.canParse(
			'KBANK',
			'KBANK: You paid 500 THB',
		)).toBe(false)
	})
})

describe('bangkokBankParser.parse – card spending', () => {
	it('parses "card *XXXX used CUR AMOUNT at MERCHANT on DD/MM/YY HH:MM"', () => {
		const msg = 'BBL: card *1234 used THB 1,500.00 at CENTRAL DEPT STORE on 23/02/26 14:30'
		const result = bangkokBankParser.parse(msg)

		expect(result).toEqual({
			operationType: 'payment',
			cardLast4: '1234',
			currencyCode: 'THB',
			amount: 1500,
			merchant: 'CENTRAL DEPT STORE',
			transactionDate: '2026-02-23',
		})
	})

	it('parses compact format without "card" keyword or "at"/"on"', () => {
		const msg = 'BBL: *4567 THB500.00 7-ELEVEN 01/03/26 09:15'
		const result = bangkokBankParser.parse(msg)

		expect(result).toEqual({
			operationType: 'payment',
			cardLast4: '4567',
			currencyCode: 'THB',
			amount: 500,
			merchant: '7-ELEVEN',
			transactionDate: '2026-03-01',
		})
	})

	it('parses "spent" keyword variant', () => {
		const msg = 'BBL: card *9999 spent USD 42.50 at AMAZON.COM on 15/01/26'
		const result = bangkokBankParser.parse(msg)

		expect(result).toEqual({
			operationType: 'payment',
			cardLast4: '9999',
			currencyCode: 'USD',
			amount: 42.5,
			merchant: 'AMAZON.COM',
			transactionDate: '2026-01-15',
		})
	})

	it('parses large amount with multiple comma separators', () => {
		const msg = 'BBL: card *1111 used THB 1,234,567.89 at BIG PURCHASE on 05/06/26'
		const result = bangkokBankParser.parse(msg)

		expect(result).not.toBeNull()
		expect(result!.amount).toBe(1234567.89)
	})

	it('handles message without merchant or date', () => {
		const msg = 'BBL: *2222 used THB 300.00'
		const result = bangkokBankParser.parse(msg)

		expect(result).toEqual({
			operationType: 'payment',
			cardLast4: '2222',
			currencyCode: 'THB',
			amount: 300,
			merchant: undefined,
			transactionDate: undefined,
		})
	})

	it('handles EUR currency', () => {
		const msg = 'BBL: card *3333 charged EUR 99.99 at SOME SHOP on 10/12/25'
		const result = bangkokBankParser.parse(msg)

		expect(result).not.toBeNull()
		expect(result!.currencyCode).toBe('EUR')
		expect(result!.amount).toBe(99.99)
	})
})

describe('bangkokBankParser.parse – account debit', () => {
	it('parses "Acct *XXXX debit CUR AMOUNT on DD/MM/YY Bal CUR AMOUNT"', () => {
		const msg = 'BBL: Acct *5678 debit THB 25,000.00 on 23/02/26 Bal THB 150,000.00'
		const result = bangkokBankParser.parse(msg)

		expect(result).toEqual({
			operationType: 'payment',
			accountLast4: '5678',
			currencyCode: 'THB',
			amount: 25000,
			transactionDate: '2026-02-23',
			balance: 150000,
		})
	})

	it('parses "withdraw" as debit', () => {
		const msg = 'BBL: Acct *1111 withdraw THB 5,000.00 on 20/01/26 Bal THB 45,000.00'
		const result = bangkokBankParser.parse(msg)

		expect(result).not.toBeNull()
		expect(result!.operationType).toBe('payment')
		expect(result!.amount).toBe(5000)
		expect(result!.balance).toBe(45000)
	})

	it('parses account debit without balance', () => {
		const msg = 'BBL: Acct *9876 debit THB 1,200.00 on 14/03/26'
		const result = bangkokBankParser.parse(msg)

		expect(result).toEqual({
			operationType: 'payment',
			accountLast4: '9876',
			currencyCode: 'THB',
			amount: 1200,
			transactionDate: '2026-03-14',
			balance: undefined,
		})
	})

	it('parses "transfer out" as debit', () => {
		const msg = 'BBL: Acct *4444 transfer out THB 10,000.00 on 01/04/26 Bal THB 90,000.00'
		const result = bangkokBankParser.parse(msg)

		expect(result).not.toBeNull()
		expect(result!.operationType).toBe('payment')
		expect(result!.amount).toBe(10000)
	})
})

describe('bangkokBankParser.parse – account credit', () => {
	it('parses "Acct *XXXX credit CUR AMOUNT on DD/MM/YY Bal CUR AMOUNT"', () => {
		const msg = 'BBL: Acct *5678 credit THB 50,000.00 on 23/02/26 Bal THB 200,000.00'
		const result = bangkokBankParser.parse(msg)

		expect(result).toEqual({
			operationType: 'income',
			accountLast4: '5678',
			currencyCode: 'THB',
			amount: 50000,
			transactionDate: '2026-02-23',
			balance: 200000,
		})
	})

	it('parses "deposit" as credit', () => {
		const msg = 'BBL: Account *7777 deposit THB 100,000.00 on 28/02/26 Balance THB 350,000.00'
		const result = bangkokBankParser.parse(msg)

		expect(result).not.toBeNull()
		expect(result!.operationType).toBe('income')
		expect(result!.amount).toBe(100000)
		expect(result!.balance).toBe(350000)
	})

	it('parses "transfer in" as credit', () => {
		const msg = 'BBL: Acct *3333 transfer in THB 15,000.00 on 05/03/26 Bal THB 65,000.00'
		const result = bangkokBankParser.parse(msg)

		expect(result).not.toBeNull()
		expect(result!.operationType).toBe('income')
	})
})

describe('bangkokBankParser.parse – date parsing', () => {
	it('handles DD.MM.YYYY format', () => {
		const msg = 'BBL: Acct *1111 debit THB 500.00 on 05.03.2026 Bal THB 9,500.00'
		const result = bangkokBankParser.parse(msg)

		expect(result).not.toBeNull()
		expect(result!.transactionDate).toBe('2026-03-05')
	})

	it('handles DD-MM-YY format', () => {
		const msg = 'BBL: Acct *1111 credit THB 1,000.00 on 15-06-26 Bal THB 11,000.00'
		const result = bangkokBankParser.parse(msg)

		expect(result).not.toBeNull()
		expect(result!.transactionDate).toBe('2026-06-15')
	})

	it('handles Buddhist calendar year (e.g. 2569)', () => {
		const msg = 'BBL: Acct *2222 debit THB 800.00 on 10/01/2569 Bal THB 4,200.00'
		const result = bangkokBankParser.parse(msg)

		expect(result).not.toBeNull()
		expect(result!.transactionDate).toBe('2026-01-10')
	})
})

describe('bangkokBankParser.parse – edge cases', () => {
	it('returns null for unrecognised message format', () => {
		const result = bangkokBankParser.parse('BBL: Your OTP code is 123456')
		expect(result).toBeNull()
	})

	it('returns null for empty string', () => {
		expect(bangkokBankParser.parse('')).toBeNull()
	})

	it('strips "BANGKOKBANK:" prefix (case-insensitive)', () => {
		const msg = 'BangkokBank: card *5555 used THB 250.00 at STARBUCKS on 01/02/26'
		const result = bangkokBankParser.parse(msg)

		expect(result).not.toBeNull()
		expect(result!.cardLast4).toBe('5555')
		expect(result!.merchant).toBe('STARBUCKS')
	})

	it('handles message with no prefix at all (just body)', () => {
		const msg = 'card *8888 used THB 750.00 at TOPS MARKET on 20/02/26 11:45'
		const result = bangkokBankParser.parse(msg)

		expect(result).not.toBeNull()
		expect(result!.cardLast4).toBe('8888')
		expect(result!.amount).toBe(750)
	})
})
