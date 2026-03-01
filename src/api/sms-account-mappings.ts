/**
 * API client for SMS account mappings CRUD.
 */
import { get, post, patch, del, type ApiOptions } from './client'

export interface SmsAccountMapping {
	id: string
	userId: string
	cardLast4: string | null
	accountLast4: string | null
	accountId: string
	defaultCategoryId: string | null
}

export interface CreateSmsMappingInput {
	cardLast4?: string | null
	accountLast4?: string | null
	accountId: string
	defaultCategoryId?: string | null
}

export interface UpdateSmsMappingInput {
	cardLast4?: string | null
	accountLast4?: string | null
	accountId?: string
	defaultCategoryId?: string | null
}

export function fetchSmsMappings(
	options?: ApiOptions,
): Promise<SmsAccountMapping[]> {
	const query = options?.userId
		? `?userId=${encodeURIComponent(options.userId)}`
		: ''
	return get<SmsAccountMapping[]>(
		`/api/sms-account-mappings${query}`,
		options,
	)
}

export function createSmsMapping(
	data: CreateSmsMappingInput,
	options?: ApiOptions,
): Promise<SmsAccountMapping> {
	return post<SmsAccountMapping>(
		'/api/sms-account-mappings',
		data,
		options,
	)
}

export function updateSmsMapping(
	id: string,
	data: UpdateSmsMappingInput,
	options?: ApiOptions,
): Promise<SmsAccountMapping> {
	return patch<SmsAccountMapping>(
		`/api/sms-account-mappings/${encodeURIComponent(id)}`,
		data,
		options,
	)
}

export function deleteSmsMapping(
	id: string,
	options?: ApiOptions,
): Promise<void> {
	return del(
		`/api/sms-account-mappings/${encodeURIComponent(id)}`,
		options,
	)
}
