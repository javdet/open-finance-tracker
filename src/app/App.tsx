import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AppLayout } from '@/components/app-layout/AppLayout'
import { LoginPage } from '@/pages/login/LoginPage'
import { ForgotPasswordPage } from '@/pages/forgot-password/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/reset-password/ResetPasswordPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { TransactionsPage } from '@/pages/transactions/TransactionsPage'
import { BudgetPage } from '@/pages/budget/BudgetPage'
import { BudgetTemplateEditorPage } from '@/pages/budget/BudgetTemplateEditorPage'
import { CategoriesPage } from '@/pages/categories/CategoriesPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { AccountPage } from '@/pages/account/AccountPage'
import { useAuth } from '@/contexts/auth-context'

function AuthGuard({ children }: { children: React.ReactNode }) {
	const { user, isLoading } = useAuth()
	const location = useLocation()

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-surface">
				<div className="text-muted">Loading...</div>
			</div>
		)
	}

	if (!user) {
		return <Navigate to="/login" state={{ from: location }} replace />
	}

	return <>{children}</>
}

function App() {
	return (
		<Routes>
			<Route path="/login" element={<LoginPage />} />
			<Route path="/forgot-password" element={<ForgotPasswordPage />} />
			<Route path="/reset-password" element={<ResetPasswordPage />} />
			<Route
				path="/"
				element={
					<AuthGuard>
						<AppLayout />
					</AuthGuard>
				}
			>
				<Route index element={<Navigate to="/dashboard" replace />} />
				<Route path="dashboard" element={<DashboardPage />} />
				<Route path="transactions" element={<TransactionsPage />} />
				<Route path="budget" element={<BudgetPage />} />
				<Route path="budget/templates/new" element={<BudgetTemplateEditorPage />} />
				<Route path="budget/templates/:id" element={<BudgetTemplateEditorPage />} />
				<Route path="categories" element={<CategoriesPage />} />
				<Route path="account" element={<AccountPage />} />
				<Route path="settings" element={<SettingsPage />} />
			</Route>
			<Route path="*" element={<Navigate to="/dashboard" replace />} />
		</Routes>
	)
}

export default App
