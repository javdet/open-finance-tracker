/**
 * Base API client for the finance-tracker backend.
 * Uses VITE_API_URL when set. In production (same-origin), uses relative URLs.
 * In dev, defaults to http://localhost:3001.
 */

const BASE_URL = (() => {
	const url =
		typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL
			? String(import.meta.env.VITE_API_URL)
			: ''
	if (url) return url
	// Production: API is served from same origin as frontend
	if (typeof import.meta !== 'undefined' && import.meta.env?.PROD) return ''
	// Dev: Vite dev server and API run on different ports
	return 'http://localhost:3001'
})()

export interface ApiOptions {
	userId?: string
	headers?: Record<string, string>
}

async function request<T>(
	path: string,
	options: RequestInit & ApiOptions = {},
): Promise<T> {
	const { userId, headers: customHeaders, ...rest } = options
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		...(customHeaders as Record<string, string>),
	}
	if (userId) {
		headers['X-User-Id'] = userId
	}
	const res = await fetch(`${BASE_URL}${path}`, {
		...rest,
		headers,
		credentials: 'include',
	})
	if (!res.ok) {
		const body = await res.text()
		let message = body
		try {
			const json = JSON.parse(body) as { error?: string }
			if (json.error) message = json.error
		} catch {
			// use body as message
		}
		throw new Error(message || `HTTP ${res.status}`)
	}
	if (res.status === 204) {
		return undefined as T
	}
	return res.json() as Promise<T>
}

export function get<T>(path: string, options?: ApiOptions & RequestInit): Promise<T> {
	return request<T>(path, { ...options, method: 'GET' })
}

export function post<T>(
	path: string,
	body?: unknown,
	options?: ApiOptions & RequestInit,
): Promise<T> {
	return request<T>(path, { ...options, method: 'POST', body: body ? JSON.stringify(body) : undefined })
}

export function patch<T>(
	path: string,
	body?: unknown,
	options?: ApiOptions & RequestInit,
): Promise<T> {
	return request<T>(path, { ...options, method: 'PATCH', body: body ? JSON.stringify(body) : undefined })
}

export function del(path: string, options?: ApiOptions & RequestInit): Promise<void> {
	return request<void>(path, { ...options, method: 'DELETE' })
}

export { BASE_URL }
