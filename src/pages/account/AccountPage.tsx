import { ChangeCredentialsSection } from '@/pages/settings/ChangeCredentialsSection'

export function AccountPage() {
	return (
		<div className="space-y-8">
			<h2 className="text-xl font-semibold text-gray-900">
				Account Settings
			</h2>
			<ChangeCredentialsSection />
		</div>
	)
}
