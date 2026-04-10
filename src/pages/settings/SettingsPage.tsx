import { ApiKeysSection } from './ApiKeysSection'
import { SmsMappingsSection } from './SmsMappingsSection'
import { SmsImportHistory } from './SmsImportHistory'
import { BlockchainImportHistory } from './BlockchainImportHistory'
import { ShortcutSetupGuide } from './ShortcutSetupGuide'

export function SettingsPage() {
	return (
		<div className="space-y-8">
			<h2 className="text-xl font-semibold text-primary">
				Settings
			</h2>
			<ApiKeysSection />
			<hr />
			<SmsMappingsSection />
			<hr />
			<SmsImportHistory />
			<hr />
			<BlockchainImportHistory />
			<hr />
			<ShortcutSetupGuide />
		</div>
	)
}
