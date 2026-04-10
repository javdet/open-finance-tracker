import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
	type ReactNode,
} from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
	theme: Theme
	setTheme: (theme: Theme) => void
	toggleTheme: () => void
}

const STORAGE_KEY = 'theme'

const ThemeContext = createContext<ThemeContextValue | null>(null)

function getInitialTheme(): Theme {
	const stored = localStorage.getItem(STORAGE_KEY)
	if (stored === 'dark' || stored === 'light') return stored
	return window.matchMedia('(prefers-color-scheme: dark)').matches
		? 'dark'
		: 'light'
}

function applyTheme(theme: Theme) {
	document.documentElement.classList.toggle('dark', theme === 'dark')
}

export function ThemeProvider({ children }: { children: ReactNode }) {
	const [theme, setThemeState] = useState<Theme>(getInitialTheme)

	useEffect(() => {
		applyTheme(theme)
	}, [theme])

	const setTheme = useCallback((next: Theme) => {
		localStorage.setItem(STORAGE_KEY, next)
		setThemeState(next)
	}, [])

	const toggleTheme = useCallback(() => {
		setTheme(theme === 'dark' ? 'light' : 'dark')
	}, [theme, setTheme])

	return (
		<ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
			{children}
		</ThemeContext.Provider>
	)
}

export function useTheme(): ThemeContextValue {
	const ctx = useContext(ThemeContext)
	if (!ctx) {
		throw new Error('useTheme must be used within ThemeProvider')
	}
	return ctx
}
