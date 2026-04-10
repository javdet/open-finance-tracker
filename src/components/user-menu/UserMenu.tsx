import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/auth-context'

function UserIcon() {
	return (
		<svg
			className="w-5 h-5"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
				d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
			/>
		</svg>
	)
}

function SettingsIcon() {
	return (
		<svg
			className="w-4 h-4"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
				d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
			/>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
				d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
			/>
		</svg>
	)
}

function LogoutIcon() {
	return (
		<svg
			className="w-4 h-4"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
				d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
			/>
		</svg>
	)
}

export function UserMenu() {
	const { user, logout } = useAuth()
	const navigate = useNavigate()
	const [isOpen, setIsOpen] = useState(false)
	const menuRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (
				menuRef.current &&
				!menuRef.current.contains(e.target as Node)
			) {
				setIsOpen(false)
			}
		}

		function handleEscape(e: KeyboardEvent) {
			if (e.key === 'Escape') {
				setIsOpen(false)
			}
		}

		if (isOpen) {
			document.addEventListener('mousedown', handleClickOutside)
			document.addEventListener('keydown', handleEscape)
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
			document.removeEventListener('keydown', handleEscape)
		}
	}, [isOpen])

	async function handleLogout() {
		setIsOpen(false)
		await logout()
		navigate('/login')
	}

	function handleAccountSettings() {
		setIsOpen(false)
		navigate('/account')
	}

	return (
		<div ref={menuRef} className="relative">
			<button
				type="button"
				onClick={() => setIsOpen((prev) => !prev)}
				className="flex items-center gap-2 rounded-full border border-strong bg-surface-card px-3 py-1.5 text-sm text-secondary hover:bg-surface-hover transition-colors"
				aria-expanded={isOpen}
				aria-haspopup="true"
			>
				<UserIcon />
				<span className="hidden sm:inline max-w-[160px] truncate">
					{user?.login}
				</span>
			</button>

			{isOpen && (
				<div
					className="absolute right-0 top-full mt-1 w-56 rounded-lg border bg-surface-card shadow-lg z-50"
					role="menu"
				>
					<div className="px-4 py-3 border-b border-subtle">
						<p className="text-sm font-medium text-primary truncate">
							{user?.login}
						</p>
					</div>

					<div className="py-1">
						<button
							type="button"
							onClick={handleAccountSettings}
							className="flex w-full items-center gap-2 px-4 py-2 text-sm text-secondary hover:bg-surface-hover"
							role="menuitem"
						>
							<SettingsIcon />
							Account Settings
						</button>
					</div>

					<div className="border-t border-subtle py-1">
						<button
							type="button"
							onClick={handleLogout}
							className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950"
							role="menuitem"
						>
							<LogoutIcon />
							Log out
						</button>
					</div>
				</div>
			)}
		</div>
	)
}
