/**
 * Background poller that monitors active wallet watches for new on-chain
 * USDT/USDC transfers and automatically creates finance-tracker operations.
 *
 * Polling cycle:
 *   1. Load all active wallet_watches
 *   2. For each watch, call the chain-specific explorer API for new transfers
 *      since the last polled block
 *   3. Deduplicate by (chain, tx_hash) via blockchain_imports
 *   4. Create an operation (income/payment) for each new transfer
 *   5. Log every result to blockchain_imports
 *   6. Update the watch's last_checked_at / last_block_number watermark
 *
 * Started from server/index.ts after the Express server is listening.
 */
import { getClient } from './index.js'
import type { Chain, BlockchainTransfer } from './index.js'
import * as walletWatchesRepo from '../../repositories/wallet-watches.js'
import type { WalletWatch } from '../../repositories/wallet-watches.js'
import * as blockchainImportsRepo from '../../repositories/blockchain-imports.js'
import * as operationsRepo from '../../repositories/operations.js'
import { getPool } from '../../db/client.js'

const DEFAULT_TICK_INTERVAL_MS = 60_000 // 1 minute check cycle

let pollTimer: ReturnType<typeof setInterval> | null = null

/** Resolve the configured (or fallback) category for a given direction. */
async function resolveCategoryId(
	userId: string,
	defaultCategoryId: string | null,
	direction: 'expense' | 'income',
): Promise<string | null> {
	if (defaultCategoryId) {
		return defaultCategoryId
	}

	const pool = getPool()
	const fallbackNames =
		direction === 'expense'
			? ['Inbox', 'Other', 'Uncategorized']
			: ['Other income', 'Other', 'Inbox']

	const result = await pool.query<{ id: string }>(
		`SELECT id::text AS id
		 FROM categories
		 WHERE user_id = $1
		   AND direction = $2
		   AND is_active = TRUE
		 ORDER BY
		   CASE name
		     WHEN $3 THEN 0
		     WHEN $4 THEN 1
		     WHEN $5 THEN 2
		     ELSE 3
		   END,
		   id
		 LIMIT 1`,
		[userId, direction, ...fallbackNames],
	)

	return result.rows[0]?.id ?? null
}

/** Determine operation type from transfer direction relative to watched address. */
function classifyTransfer(
	transfer: BlockchainTransfer,
	watchedAddress: string,
): 'income' | 'payment' {
	const watched = watchedAddress.toLowerCase()
	if (transfer.toAddress.toLowerCase() === watched) {
		return 'income'
	}
	return 'payment'
}

/**
 * Poll a single wallet watch for new transfers.
 * Returns the number of new operations created.
 */
export async function pollWatch(watch: WalletWatch): Promise<number> {
	const chain = watch.chain as Chain
	const client = getClient(chain)
	const startBlock = watch.lastBlockNumber ?? 0

	let transfers: BlockchainTransfer[]
	try {
		transfers = await client.getTokenTransfers(
			watch.walletAddress,
			startBlock,
		)
	} catch (err) {
		console.error(
			`[blockchain-poller] Failed to fetch transfers for watch ${watch.id} ` +
			`(${chain}:${watch.walletAddress}):`,
			err instanceof Error ? err.message : err,
		)
		return 0
	}

	if (transfers.length === 0) {
		await walletWatchesRepo.updateLastChecked(
			watch.id,
			startBlock,
		)
		return 0
	}

	let created = 0
	let maxBlock = startBlock

	for (const transfer of transfers) {
		if (transfer.blockNumber > maxBlock) {
			maxBlock = transfer.blockNumber
		}

		const alreadyImported = await blockchainImportsRepo.existsByChainAndTxHash(
			transfer.chain,
			transfer.txHash,
		)
		if (alreadyImported) {
			continue
		}

		const opType = classifyTransfer(transfer, watch.walletAddress)
		const direction = opType === 'income' ? 'income' : 'expense'

		const categoryId = await resolveCategoryId(
			watch.userId,
			watch.defaultCategoryId,
			direction,
		)

		if (!categoryId) {
			console.warn(
				`[blockchain-poller] No category found for watch ${watch.id} ` +
				`(${direction}), skipping tx ${transfer.txHash}`,
			)
			await blockchainImportsRepo.create({
				user_id: watch.userId,
				wallet_watch_id: watch.id,
				tx_hash: transfer.txHash,
				chain: transfer.chain,
				from_address: transfer.fromAddress,
				to_address: transfer.toAddress,
				token_symbol: transfer.tokenSymbol,
				amount: transfer.amount,
				block_number: transfer.blockNumber,
				block_timestamp: transfer.blockTimestamp,
				status: 'skipped',
				error_message: `No ${direction} category available`,
				raw_data: transfer.rawData,
			})
			continue
		}

		try {
			const signedAmount = opType === 'income'
				? Math.abs(transfer.amount)
				: -Math.abs(transfer.amount)

			const operation = await operationsRepo.createOperation({
				user_id: watch.userId,
				operation_type: opType,
				operation_time: transfer.blockTimestamp,
				account_id: watch.accountId,
				category_id: categoryId,
				amount: signedAmount,
				currency_code: transfer.tokenSymbol,
				notes: `Blockchain: ${transfer.chain} tx ${transfer.txHash.slice(0, 16)}…`,
			})

			await blockchainImportsRepo.create({
				user_id: watch.userId,
				wallet_watch_id: watch.id,
				tx_hash: transfer.txHash,
				chain: transfer.chain,
				from_address: transfer.fromAddress,
				to_address: transfer.toAddress,
				token_symbol: transfer.tokenSymbol,
				amount: transfer.amount,
				block_number: transfer.blockNumber,
				block_timestamp: transfer.blockTimestamp,
				operation_id: operation.id,
				status: 'processed',
				raw_data: transfer.rawData,
			})

			created += 1
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Unknown error'
			console.error(
				`[blockchain-poller] Failed to create operation for tx ` +
				`${transfer.txHash} (watch ${watch.id}):`,
				message,
			)

			try {
				await blockchainImportsRepo.create({
					user_id: watch.userId,
					wallet_watch_id: watch.id,
					tx_hash: transfer.txHash,
					chain: transfer.chain,
					from_address: transfer.fromAddress,
					to_address: transfer.toAddress,
					token_symbol: transfer.tokenSymbol,
					amount: transfer.amount,
					block_number: transfer.blockNumber,
					block_timestamp: transfer.blockTimestamp,
					status: 'failed',
					error_message: message,
					raw_data: transfer.rawData,
				})
			} catch {
				// Unique constraint violation (concurrent import) -- safe to ignore
			}
		}
	}

	await walletWatchesRepo.updateLastChecked(watch.id, maxBlock)

	return created
}

/** Run one poll cycle for watches whose interval has elapsed. */
export async function pollAllWatches(): Promise<void> {
	let watches: WalletWatch[]
	try {
		watches = await walletWatchesRepo.findReadyToPoll()
	} catch (err) {
		console.error(
			'[blockchain-poller] Failed to load ready watches:',
			err instanceof Error ? err.message : err,
		)
		return
	}

	if (watches.length === 0) {
		return
	}

	console.log(
		`[blockchain-poller] Polling ${watches.length} ready watch(es)…`,
	)

	let totalCreated = 0
	for (const watch of watches) {
		const count = await pollWatch(watch)
		totalCreated += count
	}

	if (totalCreated > 0) {
		console.log(
			`[blockchain-poller] Created ${totalCreated} new operation(s)`,
		)
	}
}

/** Start the background polling interval. Idempotent. */
export function startPoller(): void {
	if (pollTimer) {
		return
	}

	const intervalMs =
		Number(process.env.BLOCKCHAIN_POLL_INTERVAL_MS) || DEFAULT_TICK_INTERVAL_MS

	console.log(
		`[blockchain-poller] Starting with ${intervalMs / 1000}s tick interval`,
	)

	pollAllWatches().catch((err) => {
		console.error('[blockchain-poller] Initial poll failed:', err)
	})

	pollTimer = setInterval(() => {
		pollAllWatches().catch((err) => {
			console.error('[blockchain-poller] Poll cycle failed:', err)
		})
	}, intervalMs)
}

/** Stop the background polling interval. Idempotent. */
export function stopPoller(): void {
	if (pollTimer) {
		clearInterval(pollTimer)
		pollTimer = null
		console.log('[blockchain-poller] Stopped')
	}
}
