import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/app-layout/AppLayout'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { TransactionsPage } from '@/pages/transactions/TransactionsPage'
import { BudgetPage } from '@/pages/budget/BudgetPage'
import { CategoriesPage } from '@/pages/categories/CategoriesPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'

function App() {
	return (
		<Routes>
			<Route path="/" element={<AppLayout />}>
				<Route index element={<Navigate to="/dashboard" replace />} />
				<Route path="dashboard" element={<DashboardPage />} />
				<Route path="transactions" element={<TransactionsPage />} />
				<Route path="budget" element={<BudgetPage />} />
				<Route path="categories" element={<CategoriesPage />} />
				<Route path="settings" element={<SettingsPage />} />
			</Route>
			<Route path="*" element={<Navigate to="/dashboard" replace />} />
		</Routes>
	)
}

export default App
