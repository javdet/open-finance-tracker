import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { post } from '@/api/client'

export function ResetPasswordPage() {
	const [searchParams] = useSearchParams()
	const token = searchParams.get('token')
	const navigate = useNavigate()

	const [newPassword, setNewPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [isSubmitting, setIsSubmitting] = useState(false)

	if (!token) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-surface px-4">
				<div className="w-full max-w-sm">
					<div className="bg-surface-card rounded-lg border shadow-sm p-6 text-center">
						<h1 className="text-xl font-semibold text-primary mb-4">
							Invalid Reset Link
						</h1>
						<p className="text-sm text-muted mb-4">
							This password reset link is invalid or has expired.
						</p>
						<Link
							to="/forgot-password"
							className="text-sm font-medium text-emerald-600 hover:text-emerald-500"
						>
							Request a new reset link
						</Link>
					</div>
				</div>
			</div>
		)
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		setError(null)

		if (newPassword.length < 8) {
			setError('Password must be at least 8 characters')
			return
		}

		if (newPassword !== confirmPassword) {
			setError('Passwords do not match')
			return
		}

		setIsSubmitting(true)
		try {
			await post('/api/auth/reset-password', {
				token,
				newPassword,
			})
			navigate('/login', {
				replace: true,
				state: { passwordReset: true },
			})
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'Something went wrong',
			)
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-surface px-4">
			<div className="w-full max-w-sm">
				<div className="bg-surface-card rounded-lg border shadow-sm p-6">
					<h1 className="text-xl font-semibold text-primary text-center mb-2">
						Set New Password
					</h1>
					<p className="text-sm text-muted text-center mb-6">
						Enter your new password below.
					</p>

					<form onSubmit={handleSubmit} className="space-y-4">
						<div>
							<label
								htmlFor="newPassword"
								className="block text-sm font-medium text-secondary mb-1"
							>
								New password
							</label>
							<input
								id="newPassword"
								type="password"
								autoComplete="new-password"
								value={newPassword}
								onChange={(e) => setNewPassword(e.target.value)}
								className="w-full px-3 py-2 border border-strong rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-surface-card text-primary"
								minLength={8}
								required
							/>
							<p className="mt-1 text-xs text-faint">
								At least 8 characters
							</p>
						</div>

						<div>
							<label
								htmlFor="confirmPassword"
								className="block text-sm font-medium text-secondary mb-1"
							>
								Confirm password
							</label>
							<input
								id="confirmPassword"
								type="password"
								autoComplete="new-password"
								value={confirmPassword}
								onChange={(e) =>
									setConfirmPassword(e.target.value)
								}
								className="w-full px-3 py-2 border border-strong rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-surface-card text-primary"
								minLength={8}
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
							{isSubmitting
								? 'Resetting...'
								: 'Reset password'}
						</button>

						<Link
							to="/login"
							className="block text-center text-sm font-medium text-emerald-600 hover:text-emerald-500"
						>
							Back to sign in
						</Link>
					</form>
				</div>
			</div>
		</div>
	)
}
