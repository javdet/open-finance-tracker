/**
 * Scheduled transaction types aligned with Postgres schema
 * (scheduled_transactions, recurrence_period).
 */
export type RecurrencePeriod =
	| 'daily'
	| 'weekly'
	| 'biweekly'
	| 'monthly'
	| 'quarterly'
	| 'yearly'

export interface ScheduledTransaction {
	id: string
	userId: string
	name: string
	operationType: 'payment' | 'income'
	categoryId: string | null
	accountId: string
	transferAccountId: string | null
	amount: number
	currencyCode: string
	recurrencePeriod: RecurrencePeriod
	startDate: string
	notifyPayment: boolean
	isActive: boolean
	notes: string | null
	createdAt: string
	updatedAt: string
}

export interface CreateScheduledTransactionInput {
	userId?: string
	name: string
	operationType: 'payment' | 'income'
	categoryId?: string | null
	accountId: string
	transferAccountId?: string | null
	amount: number
	currencyCode: string
	recurrencePeriod: RecurrencePeriod
	startDate: string
	notifyPayment?: boolean
	notes?: string | null
}

export interface UpdateScheduledTransactionInput {
	name?: string
	operationType?: 'payment' | 'income'
	categoryId?: string | null
	accountId?: string
	transferAccountId?: string | null
	amount?: number
	currencyCode?: string
	recurrencePeriod?: RecurrencePeriod
	startDate?: string
	notifyPayment?: boolean
	isActive?: boolean
	notes?: string | null
}

export interface ScheduledCategoryTotal {
	categoryId: string
	monthlyAmount: number
}
