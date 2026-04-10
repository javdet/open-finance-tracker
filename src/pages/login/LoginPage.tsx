import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/auth-context'

export function LoginPage() {
	const [login, setLogin] = useState('')
	const [password, setPassword] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const { login: doLogin } = useAuth()
	const navigate = useNavigate()
	const location = useLocation()

	const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard'
	const passwordReset = (location.state as { passwordReset?: boolean })?.passwordReset

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		setError(null)
		setIsSubmitting(true)
		try {
			await doLogin(login.trim(), password)
			navigate(from, { replace: true })
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Login failed')
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-surface px-4">
			<div className="w-full max-w-sm">
				<div className="bg-surface-card rounded-lg border shadow-sm p-6">
					<h1 className="text-xl font-semibold text-primary text-center mb-6">
						Finance Tracker
					</h1>
					{passwordReset && (
						<div className="rounded-md bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 p-3 mb-4">
							<p className="text-sm text-emerald-800 dark:text-emerald-300">
								Password has been reset successfully. Please sign in with your new password.
							</p>
						</div>
					)}
					<form onSubmit={handleSubmit} className="space-y-4">
						<div>
							<label
								htmlFor="login"
								className="block text-sm font-medium text-secondary mb-1"
							>
								Login (email)
							</label>
							<input
								id="login"
								type="email"
								autoComplete="username"
								value={login}
								onChange={(e) => setLogin(e.target.value)}
								className="w-full px-3 py-2 border border-strong rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-surface-card text-primary"
								placeholder="admin@example.com"
								required
							/>
						</div>
						<div>
							<label
								htmlFor="password"
								className="block text-sm font-medium text-secondary mb-1"
							>
								Password
							</label>
							<input
								id="password"
								type="password"
								autoComplete="current-password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="w-full px-3 py-2 border border-strong rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-surface-card text-primary"
								required
							/>
						</div>
						{error && (
							<p className="text-sm text-red-600 dark:text-red-400">{error}</p>
						)}
						<button
							type="submit"
							disabled={isSubmitting}
							className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isSubmitting ? 'Signing in...' : 'Sign in'}
						</button>
						<div className="text-center">
							<Link
								to="/forgot-password"
								className="text-sm font-medium text-emerald-600 hover:text-emerald-500"
							>
								Forgot password?
							</Link>
						</div>
					</form>
				</div>
			</div>
		</div>
	)
}
