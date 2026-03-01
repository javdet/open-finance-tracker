/**
 * Auth API client.
 */
import { post, get, patch } from './client'

export interface AuthMeResponse {
	userId: string
	login: string
}

export interface LoginResponse {
	userId: string
}

export async function login(login: string, password: string): Promise<LoginResponse> {
	return post<LoginResponse>('/api/auth/login', { login, password })
}

export async function logout(): Promise<void> {
	await post('/api/auth/logout')
}

export async function fetchMe(): Promise<AuthMeResponse | null> {
	try {
		return await get<AuthMeResponse>('/api/auth/me')
	} catch {
		return null
	}
}

export async function changeCredentials(
	currentPassword: string,
	newLogin?: string,
	newPassword?: string,
): Promise<void> {
	await patch('/api/auth/credentials', {
		currentPassword,
		newLogin,
		newPassword,
	})
}
