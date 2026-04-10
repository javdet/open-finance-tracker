import { useTheme } from '@/contexts/theme-context'
import { ChangeCredentialsSection } from '@/pages/settings/ChangeCredentialsSection'

function SunIcon() {
	return (
		<svg
			className="w-5 h-5"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
			aria-hidden
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
				d="M12 3v1m0 16v1m8.66-13.66l-.71.71M4.05 19.95l-.71.71M21 12h-1M4 12H3m16.66 7.66l-.71-.71M4.05 4.05l-.71-.71M16 12a4 4 0 11-8 0 4 4 0 018 0z"
			/>
		</svg>
	)
}

function MoonIcon() {
	return (
		<svg
			className="w-5 h-5"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
			aria-hidden
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
				d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
			/>
		</svg>
	)
}

function ThemeSection() {
	const { theme, toggleTheme } = useTheme()
	const isDark = theme === 'dark'

	return (
		<div className="bg-surface-card rounded-lg border p-6">
			<h3 className="text-base font-semibold text-primary">
				Appearance
			</h3>
			<p className="mt-1 text-sm text-muted">
				Switch between light and dark theme.
			</p>
			<div className="mt-4 flex items-center gap-3">
				<span className="text-sm text-secondary">
					<SunIcon />
				</span>
				<button
					type="button"
					role="switch"
					aria-checked={isDark}
					aria-label="Toggle dark mode"
					onClick={toggleTheme}
					className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
				>
					<span
						className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-surface-card shadow-sm ring-0 transition-transform ${
							isDark ? 'translate-x-5' : 'translate-x-0'
						}`}
					/>
				</button>
				<span className="text-sm text-secondary">
					<MoonIcon />
				</span>
			</div>
		</div>
	)
}

export function AccountPage() {
	return (
		<div className="space-y-8">
			<h2 className="text-xl font-semibold text-primary">
				Account Settings
			</h2>
			<ThemeSection />
			<ChangeCredentialsSection />
		</div>
	)
}
