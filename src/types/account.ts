/**
 * Account types aligned with Postgres schema (account_type enum).
 */
export type AccountType =
	| 'cash'
	| 'card'
	| 'bank'
	| 'investment'
	| 'loan'
	| 'credit_card'
	| 'mortgage'
	| 'crypto'
	| 'other'

export interface Account {
	id: string
	userId: string
	name: string
	accountType: AccountType
	description: string | null
	currencyCode: string
	initialBalance: number
	/** Current balance (initial + operations). Present when API includes it. */
	balance?: number
	isActive: boolean
	createdAt: string
}

export interface CreateAccountInput {
	name: string
	accountType: AccountType
	description?: string | null
	currencyCode: string
	initialBalance?: number
	isActive?: boolean
}

export interface UpdateAccountInput {
	name?: string
	accountType?: AccountType
	description?: string | null
	currencyCode?: string
	initialBalance?: number
	isActive?: boolean
}
