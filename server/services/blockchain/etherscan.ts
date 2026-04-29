/**
 * Etherscan API client for fetching ERC-20 USDT/USDC transfers on
 * Ethereum. Uses the multichain V2 `tokentx` endpoint (5 req/s per API
 * key on the free tier).
 *
 * Note: Etherscan retired the legacy V1 endpoints on Aug 15, 2025 in
 * favour of the unified V2 API at `/v2/api` which requires a
 * `chainid` parameter (1 = Ethereum mainnet) and an API key for every
 * request. See https://docs.etherscan.io/v2-migration.
 */

import type { BlockchainClient, BlockchainTransfer } from './index.js'

const ETHERSCAN_BASE_URL = 'https://api.etherscan.io/v2/api'
const ETHEREUM_CHAIN_ID = '1'

const KNOWN_TOKENS: Record<string, { symbol: string; decimals: number }> = {
	'0xdac17f958d2ee523a2206206994597c13d831ec7': {
		symbol: 'USDT',
		decimals: 6,
	},
	'0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': {
		symbol: 'USDC',
		decimals: 6,
	},
}

const TOKEN_ADDRESSES = Object.keys(KNOWN_TOKENS)

interface EtherscanTokenTx {
	hash: string
	from: string
	to: string
	value: string
	contractAddress: string
	tokenDecimal: string
	tokenSymbol: string
	blockNumber: string
	timeStamp: string
}

interface EtherscanResponse {
	status: string
	message: string
	result: EtherscanTokenTx[] | string
}

function getApiKey(): string | undefined {
	return process.env.ETHERSCAN_API_KEY
}

function parseTransfer(tx: EtherscanTokenTx): BlockchainTransfer | null {
	const contractAddr = tx.contractAddress.toLowerCase()
	const token = KNOWN_TOKENS[contractAddr]
	if (!token) return null

	const decimals = Number(tx.tokenDecimal) || token.decimals
	const amount = Number(tx.value) / 10 ** decimals

	if (amount <= 0 || !Number.isFinite(amount)) return null

	return {
		txHash: tx.hash,
		chain: 'ethereum',
		fromAddress: tx.from.toLowerCase(),
		toAddress: tx.to.toLowerCase(),
		tokenSymbol: token.symbol,
		amount,
		blockNumber: Number(tx.blockNumber),
		blockTimestamp: new Date(Number(tx.timeStamp) * 1000).toISOString(),
		rawData: tx,
	}
}

export class EtherscanClient implements BlockchainClient {
	async getTokenTransfers(
		address: string,
		startBlock = 0,
	): Promise<BlockchainTransfer[]> {
		const transfers: BlockchainTransfer[] = []

		for (const contractAddress of TOKEN_ADDRESSES) {
			const batch = await this.fetchTokenTx(
				address,
				contractAddress,
				startBlock,
			)
			transfers.push(...batch)
		}

		transfers.sort((a, b) => b.blockNumber - a.blockNumber)
		return transfers
	}

	private async fetchTokenTx(
		address: string,
		contractAddress: string,
		startBlock: number,
	): Promise<BlockchainTransfer[]> {
		const apiKey = getApiKey()
		if (!apiKey) {
			throw new Error(
				'ETHERSCAN_API_KEY is not set. Etherscan V2 requires an API key — ' +
				'create one at https://etherscan.io/myapikey and set it in your env.',
			)
		}

		const params = new URLSearchParams({
			chainid: ETHEREUM_CHAIN_ID,
			module: 'account',
			action: 'tokentx',
			address,
			contractaddress: contractAddress,
			startblock: String(startBlock > 0 ? startBlock + 1 : 0),
			endblock: '99999999',
			page: '1',
			offset: '100',
			sort: 'desc',
			apikey: apiKey,
		})

		const url = `${ETHERSCAN_BASE_URL}?${params.toString()}`

		const response = await fetch(url)
		if (!response.ok) {
			throw new Error(
				`Etherscan HTTP ${response.status} ${response.statusText}`,
			)
		}

		const data = (await response.json()) as EtherscanResponse

		if (data.status !== '1' || !Array.isArray(data.result)) {
			if (data.message === 'No transactions found') return []
			// Empty result set for NOTOK with no message should also be treated as empty
			const detail =
				typeof data.result === 'string' ? data.result : data.message
			throw new Error(`Etherscan API error: ${detail}`)
		}

		const results: BlockchainTransfer[] = []
		for (const tx of data.result) {
			const transfer = parseTransfer(tx)
			if (transfer) results.push(transfer)
		}
		return results
	}
}
