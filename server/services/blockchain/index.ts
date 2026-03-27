/**
 * Blockchain Explorer Client Framework
 *
 * Common interface for querying on-chain token transfers across multiple
 * blockchains (Ethereum, Tron, Solana). Each chain has its own client
 * that normalises explorer API responses into a unified
 * {@link BlockchainTransfer} shape.
 *
 * The {@link getClient} factory returns the appropriate client for a
 * given chain, ready to query for USDT/USDC transfers.
 *
 * @module blockchain
 */

import { EtherscanClient } from './etherscan.js'
import { TronGridClient } from './trongrid.js'
import { HeliusClient } from './helius.js'

export type Chain = 'ethereum' | 'tron' | 'solana'

/** Normalised token transfer returned by every blockchain client. */
export interface BlockchainTransfer {
	txHash: string
	chain: Chain
	fromAddress: string
	toAddress: string
	tokenSymbol: string
	/** Human-readable amount (already adjusted for token decimals). */
	amount: number
	blockNumber: number
	/** ISO-8601 timestamp of the block that included the transfer. */
	blockTimestamp: string
	/** Raw API response preserved for debugging. */
	rawData: unknown
}

/**
 * Every chain-specific client must implement this interface so the
 * poller can treat all chains uniformly.
 */
export interface BlockchainClient {
	/**
	 * Fetch USDT/USDC token transfers for `address` starting after
	 * `startBlock` (exclusive). Returns newest-first order.
	 *
	 * @param address   - Wallet address to query
	 * @param startBlock - Only return transfers after this block/slot.
	 *                     Pass `0` or omit for the full history.
	 */
	getTokenTransfers(
		address: string,
		startBlock?: number,
	): Promise<BlockchainTransfer[]>
}

const clients: Record<Chain, BlockchainClient> = {
	ethereum: new EtherscanClient(),
	tron: new TronGridClient(),
	solana: new HeliusClient(),
}

/**
 * Return the blockchain explorer client for the given chain.
 *
 * @throws if the chain is not recognised (should never happen when
 *         the DB enum matches this code).
 */
export function getClient(chain: Chain): BlockchainClient {
	const client = clients[chain]
	if (!client) {
		throw new Error(`Unsupported blockchain chain: ${chain}`)
	}
	return client
}
