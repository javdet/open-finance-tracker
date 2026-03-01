/**
 * API client for API key management (create, list, revoke).
 */
import { get, post, del, type ApiOptions } from './client'

export interface ApiKey {
	id: string
	userId: string
	label: string
	isActive: boolean
	createdAt: string
}

export interface ApiKeyWithRaw extends ApiKey {
	rawKey: string
}

export function fetchApiKeys(options?: ApiOptions): Promise<ApiKey[]> {
	const query = options?.userId
		? `?userId=${encodeURIComponent(options.userId)}`
		: ''
	return get<ApiKey[]>(`/api/api-keys${query}`, options)
}

export function createApiKey(
	label: string,
	options?: ApiOptions,
): Promise<ApiKeyWithRaw> {
	return post<ApiKeyWithRaw>('/api/api-keys', { label }, options)
}

export function revokeApiKey(
	id: string,
	options?: ApiOptions,
): Promise<void> {
	return del(`/api/api-keys/${encodeURIComponent(id)}`, options)
}
