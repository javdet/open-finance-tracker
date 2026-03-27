/**
 * API client for blockchain import history (read-only).
 */
import { get, type ApiOptions } from './client'

export interface BlockchainImport {
	id: string
	userId: string
	walletWatchId: string
	txHash: string
	chain: string
	fromAddress: string
	toAddress: string
	tokenSymbol: string
	amount: number
	blockNumber: number
	blockTimestamp: string
	operationId: string | null
	status: 'processed' | 'failed' | 'skipped'
	errorMessage: string | null
	rawData: unknown
	createdAt: string
}

export interface BlockchainImportsResponse {
	rows: BlockchainImport[]
	total: number
}

export function fetchBlockchainImports(
	params?: { limit?: number; offset?: number },
	options?: ApiOptions,
): Promise<BlockchainImportsResponse> {
	const searchParams = new URLSearchParams()
	if (params?.limit != null) {
		searchParams.set('limit', String(params.limit))
	}
	if (params?.offset != null) {
		searchParams.set('offset', String(params.offset))
	}
	const query = searchParams.toString()
	return get<BlockchainImportsResponse>(
		`/api/blockchain-imports${query ? `?${query}` : ''}`,
		options,
	)
}
