import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
	type ReactNode,
} from 'react'
import {
	fetchMe,
	login as apiLogin,
	logout as apiLogout,
	changeCredentials as apiChangeCredentials,
} from '@/api/auth'

export interface AuthUser {
	userId: string
	login: string
}

interface AuthContextValue {
	user: AuthUser | null
	isLoading: boolean
	login: (login: string, password: string) => Promise<void>
	logout: () => Promise<void>
	changeCredentials: (
		currentPassword: string,
		newLogin?: string,
		newPassword?: string,
	) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<AuthUser | null>(null)
	const [isLoading, setIsLoading] = useState(true)

	const loadUser = useCallback(async () => {
		const me = await fetchMe()
		setUser(me ? { userId: me.userId, login: me.login } : null)
		setIsLoading(false)
	}, [])

	useEffect(() => {
		loadUser()
	}, [loadUser])

	const login = useCallback(
		async (loginStr: string, password: string) => {
			await apiLogin(loginStr, password)
			await loadUser()
		},
		[loadUser],
	)

	const logout = useCallback(async () => {
		await apiLogout()
		setUser(null)
	}, [])

	const changeCredentials = useCallback(
		async (
			currentPassword: string,
			newLogin?: string,
			newPassword?: string,
		) => {
			await apiChangeCredentials(currentPassword, newLogin, newPassword)
			if (newLogin) {
				setUser((prev) => (prev ? { ...prev, login: newLogin } : null))
			}
		},
		[],
	)

	const value: AuthContextValue = {
		user,
		isLoading,
		login,
		logout,
		changeCredentials,
	}

	return (
		<AuthContext.Provider value={value}>
			{children}
		</AuthContext.Provider>
	)
}

export function useAuth(): AuthContextValue {
	const ctx = useContext(AuthContext)
	if (!ctx) {
		throw new Error('useAuth must be used within AuthProvider')
	}
	return ctx
}
