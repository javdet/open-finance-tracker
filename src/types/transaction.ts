export type TransactionType = 'income' | 'expense' | 'transfer'

export interface Transaction {
	id: string
	accountId: string
	categoryId: string | null
	type: TransactionType
	amount: number
	currencyCode: string
	date: string
	note: string
	transferToAccountId: string | null
}
