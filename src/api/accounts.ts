/**
 * API client for accounts (read/write using backend data access layer).
 */
import type {
	Account,
	CreateAccountInput,
	UpdateAccountInput,
} from '@/types'
import { get, post, patch, del, type ApiOptions } from './client'

export function fetchAccounts(options?: ApiOptions): Promise<Account[]> {
	const query = options?.userId ? `?userId=${encodeURIComponent(options.userId)}` : ''
	return get<Account[]>(`/api/accounts${query}`, options)
}

export function fetchAccountById(
	id: string,
	options?: ApiOptions,
): Promise<Account> {
	const query = options?.userId ? `?userId=${encodeURIComponent(options.userId)}` : ''
	return get<Account>(`/api/accounts/${encodeURIComponent(id)}${query}`, options)
}

export function createAccount(
	data: CreateAccountInput,
	options?: ApiOptions,
): Promise<Account> {
	return post<Account>('/api/accounts', data, options)
}

export function updateAccount(
	id: string,
	data: UpdateAccountInput,
	options?: ApiOptions,
): Promise<Account> {
	return patch<Account>(`/api/accounts/${encodeURIComponent(id)}`, data, options)
}

export function deleteAccount(id: string, options?: ApiOptions): Promise<void> {
	return del(`/api/accounts/${encodeURIComponent(id)}`, options)
}
