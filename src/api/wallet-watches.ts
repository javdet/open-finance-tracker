/**
 * API client for wallet watches — CRUD for blockchain wallet monitoring
 * and on-demand polling.
 */
import { get, post, patch, del, type ApiOptions } from './client'

export type Chain = 'ethereum' | 'tron' | 'solana'

export interface WalletWatch {
	id: string
	userId: string
	chain: Chain
	walletAddress: string
	accountId: string
	defaultCategoryId: string | null
	isActive: boolean
	pollIntervalMs: number
	lastCheckedAt: string | null
	lastBlockNumber: number | null
	createdAt: string
}

export interface WalletWatchesResponse {
	rows: WalletWatch[]
	total: number
}

export interface CreateWalletWatchInput {
	chain: Chain
	walletAddress: string
	accountId: string
	defaultCategoryId?: string | null
	isActive?: boolean
	pollIntervalMs?: number
}

export interface UpdateWalletWatchInput {
	accountId?: string
	defaultCategoryId?: string | null
	isActive?: boolean
	pollIntervalMs?: number
}

export interface PollNowResponse {
	created: number
	message: string
}

export function fetchWalletWatches(
	params?: { limit?: number; offset?: number },
	options?: ApiOptions,
): Promise<WalletWatchesResponse> {
	const searchParams = new URLSearchParams()
	if (params?.limit != null) {
		searchParams.set('limit', String(params.limit))
	}
	if (params?.offset != null) {
		searchParams.set('offset', String(params.offset))
	}
	const query = searchParams.toString()
	return get<WalletWatchesResponse>(
		`/api/wallet-watches${query ? `?${query}` : ''}`,
		options,
	)
}

export function fetchWalletWatchById(
	id: string,
	options?: ApiOptions,
): Promise<WalletWatch> {
	return get<WalletWatch>(
		`/api/wallet-watches/${encodeURIComponent(id)}`,
		options,
	)
}

export async function fetchWalletWatchByAccountId(
	accountId: string,
	options?: ApiOptions,
): Promise<WalletWatch | null> {
	const result = await get<WalletWatchesResponse>(
		`/api/wallet-watches?accountId=${encodeURIComponent(accountId)}`,
		options,
	)
	return result.rows[0] ?? null
}

export function createWalletWatch(
	data: CreateWalletWatchInput,
	options?: ApiOptions,
): Promise<WalletWatch> {
	return post<WalletWatch>('/api/wallet-watches', data, options)
}

export function updateWalletWatch(
	id: string,
	data: UpdateWalletWatchInput,
	options?: ApiOptions,
): Promise<WalletWatch> {
	return patch<WalletWatch>(
		`/api/wallet-watches/${encodeURIComponent(id)}`,
		data,
		options,
	)
}

export function deleteWalletWatch(
	id: string,
	options?: ApiOptions,
): Promise<void> {
	return del(
		`/api/wallet-watches/${encodeURIComponent(id)}`,
		options,
	)
}

export function pollWalletWatchNow(
	id: string,
	options?: ApiOptions,
): Promise<PollNowResponse> {
	return post<PollNowResponse>(
		`/api/wallet-watches/${encodeURIComponent(id)}/poll-now`,
		undefined,
		options,
	)
}
