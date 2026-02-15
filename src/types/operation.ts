/**
 * Operation types aligned with Postgres schema (operation_type enum).
 */
export type OperationType = 'payment' | 'income' | 'transfer'

export interface Operation {
	id: string
	userId: string
	operationType: OperationType
	operationTime: string
	accountId: string
	transferAccountId: string | null
	categoryId: string | null
	amount: number
	currencyCode: string
	amountInBase: number | null
	notes: string | null
	createdAt: string
}

export interface CreateOperationInput {
	operationType: OperationType
	operationTime: string
	accountId: string
	transferAccountId?: string | null
	categoryId?: string | null
	amount: number
	currencyCode: string
	amountInBase?: number | null
	notes?: string | null
}

export interface UpdateOperationInput {
	operationTime?: string
	accountId?: string
	transferAccountId?: string | null
	categoryId?: string | null
	amount?: number
	currencyCode?: string
	amountInBase?: number | null
	notes?: string | null
}

/** List/query params for operations. */
export interface OperationsQuery {
	userId: string
	fromTime?: string
	toTime?: string
	accountId?: string
	categoryId?: string
	operationType?: OperationType
	limit?: number
	offset?: number
}
