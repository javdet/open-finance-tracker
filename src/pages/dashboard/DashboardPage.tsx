import { ExpenseChart } from '@/components/expense-chart/expense-chart'

export function DashboardPage() {
	return (
		<div className="space-y-6">
			<h2 className="text-xl font-semibold text-gray-900">Dashboard</h2>
			<ExpenseChart />
			<p className="text-gray-600">
				Balance panel and summary will appear here.
			</p>
		</div>
	)
}
