/**
 * TronGrid API client for fetching TRC-20 USDT/USDC transfers on the
 * Tron network. Uses the public TronGrid endpoint which requires no
 * API key and allows 15 req/s.
 */

import type { BlockchainClient, BlockchainTransfer } from './index.js'

const TRONGRID_BASE_URL = 'https://api.trongrid.io'

const KNOWN_TOKENS: Record<string, { symbol: string; decimals: number }> = {
	TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t: {
		symbol: 'USDT',
		decimals: 6,
	},
	TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8: {
		symbol: 'USDC',
		decimals: 6,
	},
}

const TOKEN_ADDRESSES = new Set(Object.keys(KNOWN_TOKENS))

interface TronTrc20Tx {
	transaction_id: string
	from: string
	to: string
	value: string
	token_info: {
		symbol: string
		address: string
		decimals: number
		name: string
	}
	block_timestamp: number
	type: string
}

interface TronGridResponse {
	data: TronTrc20Tx[]
	success: boolean
	meta?: {
		at: number
		fingerprint?: string
		page_size: number
	}
}

/**
 * Tron uses block_timestamp (ms since epoch) but does not include a
 * block number in the TRC-20 transfer API response. We approximate
 * the block number from the timestamp: Tron produces ~1 block every
 * 3 seconds. The genesis timestamp is 2018-06-25T06:00:00Z.
 */
const TRON_GENESIS_MS = 1529906400000
const TRON_BLOCK_INTERVAL_MS = 3000

function estimateBlockNumber(blockTimestampMs: number): number {
	return Math.floor(
		(blockTimestampMs - TRON_GENESIS_MS) / TRON_BLOCK_INTERVAL_MS,
	)
}

function estimateTimestampMs(blockNumber: number): number {
	return TRON_GENESIS_MS + blockNumber * TRON_BLOCK_INTERVAL_MS
}

function parseTransfer(tx: TronTrc20Tx): BlockchainTransfer | null {
	const tokenAddr = tx.token_info?.address
	if (!tokenAddr || !TOKEN_ADDRESSES.has(tokenAddr)) return null

	const token = KNOWN_TOKENS[tokenAddr]
	const decimals = tx.token_info.decimals ?? token.decimals
	const amount = Number(tx.value) / 10 ** decimals

	if (amount <= 0 || !Number.isFinite(amount)) return null

	return {
		txHash: tx.transaction_id,
		chain: 'tron',
		fromAddress: tx.from,
		toAddress: tx.to,
		tokenSymbol: token.symbol,
		amount,
		blockNumber: estimateBlockNumber(tx.block_timestamp),
		blockTimestamp: new Date(tx.block_timestamp).toISOString(),
		rawData: tx,
	}
}

export class TronGridClient implements BlockchainClient {
	async getTokenTransfers(
		address: string,
		startBlock = 0,
	): Promise<BlockchainTransfer[]> {
		const transfers: BlockchainTransfer[] = []
		let fingerprint: string | undefined
		const minTimestamp =
			startBlock > 0 ? estimateTimestampMs(startBlock) : 0
		let pageCount = 0
		const maxPages = 5

		do {
			const batch = await this.fetchPage(
				address,
				minTimestamp,
				fingerprint,
			)
			if (!batch) break

			for (const tx of batch.data) {
				const transfer = parseTransfer(tx)
				if (transfer) transfers.push(transfer)
			}

			fingerprint = batch.meta?.fingerprint
			pageCount++
		} while (fingerprint && pageCount < maxPages)

		transfers.sort((a, b) => b.blockNumber - a.blockNumber)
		return transfers
	}

	private async fetchPage(
		address: string,
		minTimestamp: number,
		fingerprint?: string,
	): Promise<TronGridResponse | null> {
		const params = new URLSearchParams({
			only_confirmed: 'true',
			limit: '100',
			order_by: 'block_timestamp,desc',
		})

		if (minTimestamp > 0) {
			params.set('min_timestamp', String(minTimestamp))
		}

		if (fingerprint) {
			params.set('fingerprint', fingerprint)
		}

		const url =
			`${TRONGRID_BASE_URL}/v1/accounts/${address}` +
			`/transactions/trc20?${params.toString()}`

		try {
			const response = await fetch(url, {
				headers: { Accept: 'application/json' },
			})

			if (!response.ok) {
				console.error(
					'TronGrid fetch failed:',
					response.status,
					response.statusText,
				)
				return null
			}

			const data = (await response.json()) as TronGridResponse

			if (!data.success) {
				console.error('TronGrid API error:', data)
				return null
			}

			return data
		} catch (err) {
			console.error('TronGrid request error:', err)
			return null
		}
	}
}
