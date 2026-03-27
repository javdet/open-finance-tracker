import { ApiKeysSection } from './ApiKeysSection'
import { ChangeCredentialsSection } from './ChangeCredentialsSection'
import { SmsMappingsSection } from './SmsMappingsSection'
import { SmsImportHistory } from './SmsImportHistory'
import { WalletWatchesSection } from './WalletWatchesSection'
import { BlockchainImportHistory } from './BlockchainImportHistory'
import { ShortcutSetupGuide } from './ShortcutSetupGuide'

export function SettingsPage() {
	return (
		<div className="space-y-8">
			<h2 className="text-xl font-semibold text-gray-900">
				Settings
			</h2>
			<ChangeCredentialsSection />
			<hr className="border-gray-200" />
			<ApiKeysSection />
			<hr className="border-gray-200" />
			<SmsMappingsSection />
			<hr className="border-gray-200" />
			<SmsImportHistory />
			<hr className="border-gray-200" />
			<WalletWatchesSection />
			<hr className="border-gray-200" />
			<BlockchainImportHistory />
			<hr className="border-gray-200" />
			<ShortcutSetupGuide />
		</div>
	)
}
