import { useState } from 'react'
import { Link } from 'react-router-dom'
import { post } from '@/api/client'

export function ForgotPasswordPage() {
	const [email, setEmail] = useState('')
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [submitted, setSubmitted] = useState(false)
	const [error, setError] = useState<string | null>(null)

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		setError(null)
		setIsSubmitting(true)
		try {
			await post('/api/auth/forgot-password', { email: email.trim() })
			setSubmitted(true)
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'Something went wrong',
			)
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
			<div className="w-full max-w-sm">
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
					<h1 className="text-xl font-semibold text-gray-900 text-center mb-2">
						Reset Password
					</h1>
					<p className="text-sm text-gray-500 text-center mb-6">
						Enter your email and we&apos;ll send you a reset link.
					</p>

					{submitted ? (
						<div className="space-y-4">
							<div className="rounded-md bg-emerald-50 border border-emerald-200 p-4">
								<p className="text-sm text-emerald-800">
									If an account with that email exists, a
									password reset link has been sent. Please
									check your inbox.
								</p>
							</div>
							<Link
								to="/login"
								className="block text-center text-sm font-medium text-emerald-600 hover:text-emerald-500"
							>
								Back to sign in
							</Link>
						</div>
					) : (
						<form onSubmit={handleSubmit} className="space-y-4">
							<div>
								<label
									htmlFor="email"
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									Email
								</label>
								<input
									id="email"
									type="email"
									autoComplete="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
									placeholder="admin@example.com"
									required
								/>
							</div>

							{error && (
								<p className="text-sm text-red-600">{error}</p>
							)}

							<button
								type="submit"
								disabled={isSubmitting}
								className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{isSubmitting
									? 'Sending...'
									: 'Send reset link'}
							</button>

							<Link
								to="/login"
								className="block text-center text-sm font-medium text-emerald-600 hover:text-emerald-500"
							>
								Back to sign in
							</Link>
						</form>
					)}
				</div>
			</div>
		</div>
	)
}
