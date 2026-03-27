/**
 * Helius API client for fetching SPL USDT/USDC transfers on Solana.
 * Requires a free Helius API key (1 M credits/month on the free tier;
 * each call costs ~10 credits).
 *
 * Uses the `getSignaturesForAddress` RPC call followed by the Helius
 * `parseTransactions` enhanced API to get human-readable transfer
 * data including token amounts and mints.
 */

import type { BlockchainClient, BlockchainTransfer } from './index.js'

const KNOWN_MINTS: Record<string, { symbol: string; decimals: number }> = {
	Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: {
		symbol: 'USDT',
		decimals: 6,
	},
	EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: {
		symbol: 'USDC',
		decimals: 6,
	},
}

const KNOWN_MINT_SET = new Set(Object.keys(KNOWN_MINTS))

interface HeliusTokenTransfer {
	fromUserAccount: string
	toUserAccount: string
	fromTokenAccount: string
	toTokenAccount: string
	tokenAmount: number
	mint: string
	tokenStandard: string
}

interface HeliusParsedTx {
	signature: string
	slot: number
	timestamp: number
	tokenTransfers: HeliusTokenTransfer[]
	type: string
	description: string
	source: string
	fee: number
	feePayer: string
	transactionError: string | null
}

interface SolanaSignature {
	signature: string
	slot: number
	blockTime: number | null
	err: unknown | null
	confirmationStatus: string
}

function getApiKey(): string | undefined {
	return process.env.HELIUS_API_KEY
}

function getRpcUrl(apiKey: string): string {
	return `https://mainnet.helius-rpc.com/?api-key=${apiKey}`
}

function getParseUrl(apiKey: string): string {
	return `https://api.helius.xyz/v0/transactions/?api-key=${apiKey}`
}

export class HeliusClient implements BlockchainClient {
	async getTokenTransfers(
		address: string,
		startBlock = 0,
	): Promise<BlockchainTransfer[]> {
		const apiKey = getApiKey()
		if (!apiKey) {
			console.error(
				'HELIUS_API_KEY is not set — Solana polling is disabled',
			)
			return []
		}

		try {
			const signatures = await this.getSignatures(
				address,
				startBlock,
				apiKey,
			)
			if (signatures.length === 0) return []

			const parsed = await this.parseTransactions(
				signatures.map((s) => s.signature),
				apiKey,
			)

			return this.extractTransfers(parsed, address)
		} catch (err) {
			console.error('Helius request error:', err)
			return []
		}
	}

	/**
	 * Fetch recent confirmed transaction signatures for a wallet.
	 * Only returns signatures whose slot is greater than `afterSlot`.
	 */
	private async getSignatures(
		address: string,
		afterSlot: number,
		apiKey: string,
	): Promise<SolanaSignature[]> {
		const body = {
			jsonrpc: '2.0',
			id: 1,
			method: 'getSignaturesForAddress',
			params: [
				address,
				{
					limit: 100,
					...(afterSlot > 0 ? { minContextSlot: afterSlot } : {}),
				},
			],
		}

		const response = await fetch(getRpcUrl(apiKey), {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		})

		if (!response.ok) {
			console.error(
				'Helius RPC fetch failed:',
				response.status,
				response.statusText,
			)
			return []
		}

		const data = (await response.json()) as {
			result: SolanaSignature[]
			error?: { message: string }
		}

		if (data.error) {
			console.error('Helius RPC error:', data.error.message)
			return []
		}

		const sigs = data.result ?? []
		if (afterSlot > 0) {
			return sigs.filter((s) => s.slot > afterSlot)
		}
		return sigs
	}

	/**
	 * Parse raw transactions into Helius enhanced format which
	 * includes decoded token transfers. Batches in groups of 100
	 * (Helius API limit).
	 */
	private async parseTransactions(
		signatures: string[],
		apiKey: string,
	): Promise<HeliusParsedTx[]> {
		const results: HeliusParsedTx[] = []
		const batchSize = 100

		for (let i = 0; i < signatures.length; i += batchSize) {
			const batch = signatures.slice(i, i + batchSize)

			const response = await fetch(getParseUrl(apiKey), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ transactions: batch }),
			})

			if (!response.ok) {
				console.error(
					'Helius parse failed:',
					response.status,
					response.statusText,
				)
				continue
			}

			const parsed = (await response.json()) as HeliusParsedTx[]
			if (Array.isArray(parsed)) {
				results.push(...parsed)
			}
		}

		return results
	}

	/**
	 * Walk over parsed transactions and extract USDT/USDC token
	 * transfers that involve the watched wallet address.
	 */
	private extractTransfers(
		parsed: HeliusParsedTx[],
		watchedAddress: string,
	): BlockchainTransfer[] {
		const transfers: BlockchainTransfer[] = []
		const addr = watchedAddress.toLowerCase()

		for (const tx of parsed) {
			if (tx.transactionError) continue

			for (const tt of tx.tokenTransfers ?? []) {
				if (!KNOWN_MINT_SET.has(tt.mint)) continue

				const from = tt.fromUserAccount?.toLowerCase() ?? ''
				const to = tt.toUserAccount?.toLowerCase() ?? ''

				if (from !== addr && to !== addr) continue

				const token = KNOWN_MINTS[tt.mint]
				const amount = tt.tokenAmount

				if (!amount || amount <= 0) continue

				transfers.push({
					txHash: tx.signature,
					chain: 'solana',
					fromAddress: tt.fromUserAccount ?? '',
					toAddress: tt.toUserAccount ?? '',
					tokenSymbol: token.symbol,
					amount,
					blockNumber: tx.slot,
					blockTimestamp: new Date(
						tx.timestamp * 1000,
					).toISOString(),
					rawData: tx,
				})
			}
		}

		transfers.sort((a, b) => b.blockNumber - a.blockNumber)
		return transfers
	}
}
