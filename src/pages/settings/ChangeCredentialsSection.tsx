import { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'

export function ChangeCredentialsSection() {
	const { user, changeCredentials } = useAuth()
	const [currentPassword, setCurrentPassword] = useState('')
	const [newLogin, setNewLogin] = useState(user?.login ?? '')
	const [newPassword, setNewPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [success, setSuccess] = useState(false)
	const [isSubmitting, setIsSubmitting] = useState(false)

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		setError(null)
		setSuccess(false)

		if (newPassword && newPassword !== confirmPassword) {
			setError('New password and confirmation do not match')
			return
		}

		if (!newLogin.trim() && !newPassword) {
			setError('Provide at least one change (new login or new password)')
			return
		}

		setIsSubmitting(true)
		try {
			await changeCredentials(
				currentPassword,
				newLogin.trim() || undefined,
				newPassword || undefined,
			)
			setSuccess(true)
			setCurrentPassword('')
			setNewPassword('')
			setConfirmPassword('')
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to update credentials')
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<div>
			<h3 className="text-lg font-medium text-primary mb-2">
				Change login and password
			</h3>
			<form onSubmit={handleSubmit} className="space-y-4 max-w-md">
				<div>
					<label
						htmlFor="current-password"
						className="block text-sm font-medium text-secondary mb-1"
					>
						Current password
					</label>
					<input
						id="current-password"
						type="password"
						autoComplete="current-password"
						value={currentPassword}
						onChange={(e) => setCurrentPassword(e.target.value)}
						className="w-full px-3 py-2 border border-strong rounded-md shadow-sm bg-surface-card text-primary focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
						required
					/>
				</div>
				<div>
					<label
						htmlFor="new-login"
						className="block text-sm font-medium text-secondary mb-1"
					>
						New login (email)
					</label>
					<input
						id="new-login"
						type="email"
						autoComplete="username"
						value={newLogin}
						onChange={(e) => setNewLogin(e.target.value)}
						className="w-full px-3 py-2 border border-strong rounded-md shadow-sm bg-surface-card text-primary focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
						placeholder={user?.login}
					/>
				</div>
				<div>
					<label
						htmlFor="new-password"
						className="block text-sm font-medium text-secondary mb-1"
					>
						New password
					</label>
					<input
						id="new-password"
						type="password"
						autoComplete="new-password"
						value={newPassword}
						onChange={(e) => setNewPassword(e.target.value)}
						className="w-full px-3 py-2 border border-strong rounded-md shadow-sm bg-surface-card text-primary focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
					/>
				</div>
				<div>
					<label
						htmlFor="confirm-password"
						className="block text-sm font-medium text-secondary mb-1"
					>
						Confirm new password
					</label>
					<input
						id="confirm-password"
						type="password"
						autoComplete="new-password"
						value={confirmPassword}
						onChange={(e) => setConfirmPassword(e.target.value)}
						className="w-full px-3 py-2 border border-strong rounded-md shadow-sm bg-surface-card text-primary focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
					/>
				</div>
				{error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
				{success && (
					<p className="text-sm text-emerald-600">
						Credentials updated successfully.
					</p>
				)}
				<button
					type="submit"
					disabled={isSubmitting}
					className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{isSubmitting ? 'Updating...' : 'Update credentials'}
				</button>
			</form>
		</div>
	)
}
