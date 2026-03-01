/**
 * API client for SMS import history (read-only).
 */
import { get, type ApiOptions } from './client'

export interface SmsImport {
	id: string
	userId: string
	rawMessage: string
	sender: string | null
	receivedAt: string | null
	parserUsed: string | null
	parsedData: Record<string, unknown> | null
	operationId: string | null
	status: 'pending' | 'processed' | 'failed' | 'duplicate'
	errorMessage: string | null
	messageHash: string
	createdAt: string
}

export interface SmsImportsResponse {
	rows: SmsImport[]
	total: number
}

export function fetchSmsImports(
	params?: { limit?: number; offset?: number },
	options?: ApiOptions,
): Promise<SmsImportsResponse> {
	const searchParams = new URLSearchParams()
	if (options?.userId) {
		searchParams.set('userId', options.userId)
	}
	if (params?.limit != null) {
		searchParams.set('limit', String(params.limit))
	}
	if (params?.offset != null) {
		searchParams.set('offset', String(params.offset))
	}
	const query = searchParams.toString()
	return get<SmsImportsResponse>(
		`/api/sms-imports${query ? `?${query}` : ''}`,
		options,
	)
}
