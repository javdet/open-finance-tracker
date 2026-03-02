import { describe, it, expect } from 'vitest'
import { thaiTransferSmsParser } from './thai-transfer-sms.js'

describe('thaiTransferSmsParser.canParse', () => {
	it('matches income messages starting with "Transfer to your account"', () => {
		expect(thaiTransferSmsParser.canParse(
			'BANK',
			'Transfer to your account X1234 of Bt 5,000.00 via MOBILE; the available balance is Bt 45,000.00',
		)).toBe(true)
	})

	it('matches expense messages starting with "Withdrawal/transfer/payment from your account"', () => {
		expect(thaiTransferSmsParser.canParse(
			'BANK',
			'Withdrawal/transfer/payment from your account X5678 of Bt 3,000.00 via DBCARD; the available balance is Bt 42,000.00',
		)).toBe(true)
	})

	it('matches expense messages starting with "Withdrawal from your account"', () => {
		expect(thaiTransferSmsParser.canParse(
			'BANK',
			'Withdrawal from your account X1234 of Bt 1,000.00 via ATM; the available balance is Bt 9,000.00',
		)).toBe(true)
	})

	it('matches expense messages starting with "payment from your account"', () => {
		expect(thaiTransferSmsParser.canParse(
			'12345',
			'payment from your account X9999 of Bt 500.00 via DBCARD; the available balance is Bt 10,000.00',
		)).toBe(true)
	})

	it('is case-insensitive for income prefix', () => {
		expect(thaiTransferSmsParser.canParse(
			'BANK',
			'transfer to your account X1234 of Bt 100.00 via MOBILE; the available balance is Bt 900.00',
		)).toBe(true)
	})

	it('rejects unrelated messages', () => {
		expect(thaiTransferSmsParser.canParse(
			'BANK',
			'Your OTP code is 123456',
		)).toBe(false)
	})

	it('rejects BBL-prefixed messages', () => {
		expect(thaiTransferSmsParser.canParse(
			'BBL',
			'BBL: Acct *5678 debit THB 500.00',
		)).toBe(false)
	})
})

describe('thaiTransferSmsParser.parse – income', () => {
	it('parses full income message with balance and time', () => {
		const msg = 'Transfer to your account X1234 of Bt 5,000.00 via MOBILE; the available balance is Bt 45,000.00@12:34'
		const result = thaiTransferSmsParser.parse(msg)

		expect(result).toEqual({
			operationType: 'income',
			accountLast4: '1234',
			amount: 5000,
			currencyCode: 'THB',
			merchant: 'MOBILE',
			balance: 45000,
		})
	})

	it('parses income message without time suffix', () => {
		const msg = 'Transfer to your account X9876 of Bt 12,500.00 via MOBILE; the available balance is Bt 62,500.00'
		const result = thaiTransferSmsParser.parse(msg)

		expect(result).toEqual({
			operationType: 'income',
			accountLast4: '9876',
			amount: 12500,
			currencyCode: 'THB',
			merchant: 'MOBILE',
			balance: 62500,
		})
	})

	it('parses income with AUTO system method', () => {
		const msg = 'Transfer to your account X4444 of Bt 100,000.00 via AUTO system; the available balance is Bt 250,000.00@09:15'
		const result = thaiTransferSmsParser.parse(msg)

		expect(result).not.toBeNull()
		expect(result!.operationType).toBe('income')
		expect(result!.merchant).toBe('AUTO system')
		expect(result!.amount).toBe(100000)
		expect(result!.balance).toBe(250000)
	})

	it('handles amounts with multiple comma separators', () => {
		const msg = 'Transfer to your account X5555 of Bt 1,234,567.89 via MOBILE; the available balance is Bt 2,345,678.90'
		const result = thaiTransferSmsParser.parse(msg)

		expect(result).not.toBeNull()
		expect(result!.amount).toBe(1234567.89)
		expect(result!.balance).toBe(2345678.9)
	})
})

describe('thaiTransferSmsParser.parse – expense', () => {
	it('parses "Withdrawal/transfer/payment" expense with balance and time', () => {
		const msg = 'Withdrawal/transfer/payment from your account X5678 of Bt 3,000.00 via DBCARD; the available balance is Bt 42,000.00.@14:30'
		const result = thaiTransferSmsParser.parse(msg)

		expect(result).toEqual({
			operationType: 'payment',
			accountLast4: '5678',
			amount: 3000,
			currencyCode: 'THB',
			merchant: 'DBCARD',
			balance: 42000,
		})
	})

	it('parses expense via MOBILE method', () => {
		const msg = 'Withdrawal/transfer/payment from your account X1111 of Bt 750.00 via MOBILE; the available balance is Bt 9,250.00@08:00'
		const result = thaiTransferSmsParser.parse(msg)

		expect(result).not.toBeNull()
		expect(result!.operationType).toBe('payment')
		expect(result!.merchant).toBe('MOBILE')
		expect(result!.amount).toBe(750)
		expect(result!.balance).toBe(9250)
	})

	it('parses expense via AUTO system', () => {
		const msg = 'Withdrawal/transfer/payment from your account X2222 of Bt 15,000.00 via AUTO system; the available balance is Bt 85,000.00.@16:45'
		const result = thaiTransferSmsParser.parse(msg)

		expect(result).not.toBeNull()
		expect(result!.operationType).toBe('payment')
		expect(result!.merchant).toBe('AUTO system')
		expect(result!.amount).toBe(15000)
	})

	it('parses "Withdrawal from your account" variant', () => {
		const msg = 'Withdrawal from your account X3333 of Bt 2,000.00 via ATM; the available balance is Bt 18,000.00'
		const result = thaiTransferSmsParser.parse(msg)

		expect(result).not.toBeNull()
		expect(result!.operationType).toBe('payment')
		expect(result!.amount).toBe(2000)
	})

	it('parses "payment from your account" variant', () => {
		const msg = 'payment from your account X7777 of Bt 499.00 via DBCARD; the available balance is Bt 500.00'
		const result = thaiTransferSmsParser.parse(msg)

		expect(result).not.toBeNull()
		expect(result!.operationType).toBe('payment')
		expect(result!.accountLast4).toBe('7777')
		expect(result!.amount).toBe(499)
	})

	it('parses expense without time suffix', () => {
		const msg = 'Withdrawal/transfer/payment from your account X8888 of Bt 6,500.00 via DBCARD; the available balance is Bt 23,500.00'
		const result = thaiTransferSmsParser.parse(msg)

		expect(result).toEqual({
			operationType: 'payment',
			accountLast4: '8888',
			amount: 6500,
			currencyCode: 'THB',
			merchant: 'DBCARD',
			balance: 23500,
		})
	})
})

describe('thaiTransferSmsParser.parse – edge cases', () => {
	it('handles amounts with commas correctly', () => {
		const msg = 'Transfer to your account X1234 of Bt 1,000,000.00 via MOBILE; the available balance is Bt 2,000,000.00'
		const result = thaiTransferSmsParser.parse(msg)

		expect(result).not.toBeNull()
		expect(result!.amount).toBe(1000000)
		expect(result!.balance).toBe(2000000)
	})

	it('handles missing balance section', () => {
		const msg = 'Transfer to your account X6666 of Bt 500.00 via MOBILE'
		const result = thaiTransferSmsParser.parse(msg)

		expect(result).not.toBeNull()
		expect(result!.operationType).toBe('income')
		expect(result!.amount).toBe(500)
		expect(result!.balance).toBeUndefined()
	})

	it('handles missing time suffix on expense', () => {
		const msg = 'Withdrawal/transfer/payment from your account X4321 of Bt 800.00 via DBCARD; the available balance is Bt 1,200.00'
		const result = thaiTransferSmsParser.parse(msg)

		expect(result).not.toBeNull()
		expect(result!.balance).toBe(1200)
	})

	it('returns null for unrecognised message format', () => {
		const result = thaiTransferSmsParser.parse('Your OTP code is 123456')
		expect(result).toBeNull()
	})

	it('returns null for empty string', () => {
		expect(thaiTransferSmsParser.parse('')).toBeNull()
	})

	it('always sets currency to THB', () => {
		const msg = 'Transfer to your account X1234 of Bt 100.00 via MOBILE; the available balance is Bt 900.00'
		const result = thaiTransferSmsParser.parse(msg)

		expect(result).not.toBeNull()
		expect(result!.currencyCode).toBe('THB')
	})

	it('parses time after period-at separator (.@) on expense', () => {
		const msg = 'Withdrawal/transfer/payment from your account X9999 of Bt 200.00 via DBCARD; the available balance is Bt 9,800.00.@23:59'
		const result = thaiTransferSmsParser.parse(msg)

		expect(result).not.toBeNull()
		expect(result!.balance).toBe(9800)
	})

	it('parses time after plain @ separator on income', () => {
		const msg = 'Transfer to your account X1234 of Bt 300.00 via MOBILE; the available balance is Bt 1,300.00@06:00'
		const result = thaiTransferSmsParser.parse(msg)

		expect(result).not.toBeNull()
		expect(result!.balance).toBe(1300)
	})
})
