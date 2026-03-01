import { useState } from 'react'
import { clsx } from '@/lib/clsx'

interface StepProps {
	number: number
	title: string
	children: React.ReactNode
	isActive: boolean
	isCompleted: boolean
	onToggle: () => void
}

function CheckIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
				d="M5 13l4 4L19 7"
			/>
		</svg>
	)
}

function ChevronIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
				d="M19 9l-7 7-7-7"
			/>
		</svg>
	)
}

function CopyIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
				d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
			/>
		</svg>
	)
}

function PhoneIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
				d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
			/>
		</svg>
	)
}

function CopyButton({ text }: { text: string }) {
	const [copied, setCopied] = useState(false)

	function handleCopy() {
		navigator.clipboard.writeText(text).then(() => {
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		})
	}

	return (
		<button
			type="button"
			onClick={handleCopy}
			className={clsx(
				'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors',
				copied
					? 'text-emerald-700 bg-emerald-50'
					: 'text-gray-500 hover:text-gray-700 hover:bg-gray-100',
			)}
			aria-label="Copy to clipboard"
		>
			{copied ? (
				<>
					<CheckIcon className="w-3 h-3" />
					Copied
				</>
			) : (
				<>
					<CopyIcon className="w-3 h-3" />
					Copy
				</>
			)}
		</button>
	)
}

function CodeBlock({ children }: { children: string }) {
	return (
		<div className="relative group">
			<div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
				<CopyButton text={children.trim()} />
			</div>
			<pre className="bg-gray-900 text-gray-100 rounded-lg px-4 py-3 text-sm overflow-x-auto font-mono leading-relaxed">
				{children.trim()}
			</pre>
		</div>
	)
}

function Tip({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
			<span className="shrink-0 mt-0.5 text-amber-500 font-bold">
				Tip
			</span>
			<div>{children}</div>
		</div>
	)
}

function Warning({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
			<span className="shrink-0 mt-0.5 text-red-500 font-bold">
				Important
			</span>
			<div>{children}</div>
		</div>
	)
}

function Step({
	number,
	title,
	children,
	isActive,
	isCompleted,
	onToggle,
}: StepProps) {
	return (
		<div
			className={clsx(
				'rounded-lg border transition-colors',
				isActive
					? 'border-emerald-200 bg-white shadow-sm'
					: 'border-gray-200 bg-white',
			)}
		>
			<button
				type="button"
				onClick={onToggle}
				className="flex w-full items-center gap-3 px-4 py-3 text-left"
				aria-expanded={isActive}
			>
				<span
					className={clsx(
						'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors',
						isCompleted
							? 'bg-emerald-100 text-emerald-700'
							: isActive
								? 'bg-emerald-600 text-white'
								: 'bg-gray-100 text-gray-500',
					)}
				>
					{isCompleted ? (
						<CheckIcon className="w-4 h-4" />
					) : (
						number
					)}
				</span>
				<span
					className={clsx(
						'flex-1 text-sm font-medium',
						isActive ? 'text-gray-900' : 'text-gray-700',
					)}
				>
					{title}
				</span>
				<ChevronIcon
					className={clsx(
						'w-4 h-4 text-gray-400 transition-transform',
						isActive && 'rotate-180',
					)}
				/>
			</button>
			{isActive && (
				<div className="px-4 pb-4 pl-14 space-y-3 animate-fade-in">
					{children}
				</div>
			)}
		</div>
	)
}

function InlineKbd({ children }: { children: React.ReactNode }) {
	return (
		<span className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 text-xs font-medium text-gray-700 font-mono">
			{children}
		</span>
	)
}

const WEBHOOK_URL_PLACEHOLDER = 'https://<your-domain>/api/sms-webhook'

const JSON_BODY_EXAMPLE = `{
  "message": "<Shortcut Input>",
  "sender": "BANGKOKBANK",
  "receivedAt": "<Current Date (ISO 8601)>"
}`

export function ShortcutSetupGuide() {
	const [activeStep, setActiveStep] = useState<number | null>(null)
	const [completedSteps, setCompletedSteps] = useState<Set<number>>(
		new Set(),
	)

	function handleToggle(step: number) {
		setActiveStep((prev) => (prev === step ? null : step))
	}

	function handleMarkComplete(step: number) {
		setCompletedSteps((prev) => {
			const next = new Set(prev)
			if (next.has(step)) {
				next.delete(step)
			} else {
				next.add(step)
			}
			return next
		})
	}

	const allCompleted = completedSteps.size >= 6

	return (
		<section aria-labelledby="shortcut-guide-heading">
			<div className="flex items-start gap-3 mb-4">
				<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
					<PhoneIcon className="w-5 h-5" />
				</div>
				<div>
					<h3
						id="shortcut-guide-heading"
						className="text-base font-semibold text-gray-900"
					>
						iPhone Shortcut Setup
					</h3>
					<p className="text-sm text-gray-500 mt-0.5">
						Auto-import transactions from Bangkok Bank SMS
						notifications using iOS Shortcuts.
					</p>
				</div>
			</div>

			<div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 mb-4">
				<p className="font-medium mb-1">How it works</p>
				<p className="text-blue-700">
					When your iPhone receives an SMS from Bangkok Bank, an iOS
					Shortcut automation forwards the message to your Finance
					Tracker server. The server parses the SMS and automatically
					creates a transaction.
				</p>
			</div>

			<div className="space-y-2">
				<Step
					number={1}
					title="Prerequisites"
					isActive={activeStep === 1}
					isCompleted={completedSteps.has(1)}
					onToggle={() => handleToggle(1)}
				>
					<p className="text-sm text-gray-600">
						Before starting, make sure you have the following ready:
					</p>
					<ul className="text-sm text-gray-600 list-disc list-inside space-y-1.5 ml-1">
						<li>
							An iPhone running{' '}
							<strong>iOS 16 or later</strong> with the{' '}
							<strong>Shortcuts</strong> app installed (comes
							pre-installed)
						</li>
						<li>
							Your Finance Tracker server accessible via a{' '}
							<strong>public URL</strong> (e.g. through
							Cloudflare Tunnel)
						</li>
						<li>
							An <strong>API key</strong> generated from
							Settings &gt; API Keys in this app
						</li>
						<li>
							SMS notifications enabled for your{' '}
							<strong>Bangkok Bank</strong> account
						</li>
					</ul>
					<Tip>
						If your server is not publicly accessible, set up a{' '}
						<strong>Cloudflare Tunnel</strong> first. Run{' '}
						<InlineKbd>
							cloudflared tunnel --url
							http://localhost:3001
						</InlineKbd>{' '}
						to get a public URL.
					</Tip>
					<div className="pt-1">
						<button
							type="button"
							onClick={() => handleMarkComplete(1)}
							className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
						>
							{completedSteps.has(1)
								? 'Unmark as done'
								: 'Mark as done'}
						</button>
					</div>
				</Step>

				<Step
					number={2}
					title="Create a new Automation"
					isActive={activeStep === 2}
					isCompleted={completedSteps.has(2)}
					onToggle={() => handleToggle(2)}
				>
					<ol className="text-sm text-gray-600 list-decimal list-inside space-y-2 ml-1">
						<li>
							Open the <strong>Shortcuts</strong> app on your
							iPhone
						</li>
						<li>
							Tap the <strong>Automation</strong> tab at the
							bottom of the screen (not the Shortcuts tab)
						</li>
						<li>
							Tap the{' '}
							<InlineKbd>+</InlineKbd>{' '}
							button in the top-right corner to create a new
							automation
						</li>
						<li>
							Scroll through the <strong>Personal
							Automation</strong> trigger list and tap{' '}
							<strong>&ldquo;Message&rdquo;</strong>
						</li>
					</ol>
					<Warning>
						Do <strong>not</strong> search for &ldquo;Messages&rdquo;
						in the actions library &mdash; that shows actions like
						&ldquo;Send Message&rdquo; or &ldquo;Open
						Conversation&rdquo;, which are not what you need. The{' '}
						<strong>Message trigger</strong> is only available when
						creating a new <strong>Automation</strong> (step 3
						above). It appears in the trigger list alongside
						triggers like &ldquo;Time of Day&rdquo;, &ldquo;Arrive
						at&rdquo;, &ldquo;Wi-Fi&rdquo;, etc.
					</Warning>
					<ol
						className="text-sm text-gray-600 list-decimal list-inside space-y-2 ml-1"
						start={5}
					>
						<li>
							In the <strong>Sender</strong> field, type{' '}
							<InlineKbd>BANGKOKBANK</InlineKbd> (or the
							exact sender name that appears in your SMS
							messages)
						</li>
						<li>
							Under &ldquo;Message Contains&rdquo; leave it{' '}
							<strong>empty</strong> to capture all messages
							from this sender
						</li>
						<li>
							Set to{' '}
							<strong>
								&ldquo;Run Immediately&rdquo;
							</strong>
						</li>
						<li>
							Toggle <strong>off</strong>{' '}
							&ldquo;Notify When Run&rdquo; (optional, for
							silent operation)
						</li>
					</ol>
					<Tip>
						The exact sender name may vary by region. Check your
						Messages app for the exact sender name that Bangkok
						Bank uses.
					</Tip>
					<div className="pt-1">
						<button
							type="button"
							onClick={() => handleMarkComplete(2)}
							className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
						>
							{completedSteps.has(2)
								? 'Unmark as done'
								: 'Mark as done'}
						</button>
					</div>
				</Step>

				<Step
					number={3}
					title='Add the "Get Contents of URL" action'
					isActive={activeStep === 3}
					isCompleted={completedSteps.has(3)}
					onToggle={() => handleToggle(3)}
				>
					<p className="text-sm text-gray-600 mb-2">
						In the shortcut editor, add a single action that sends
						the SMS content to your server:
					</p>
					<ol className="text-sm text-gray-600 list-decimal list-inside space-y-2 ml-1">
						<li>
							Tap{' '}
							<strong>
								&ldquo;Add Action&rdquo;
							</strong>{' '}
							and search for{' '}
							<InlineKbd>
								Get Contents of URL
							</InlineKbd>
						</li>
						<li>
							Set the <strong>URL</strong> to your webhook
							endpoint:
						</li>
					</ol>
					<CodeBlock>{WEBHOOK_URL_PLACEHOLDER}</CodeBlock>
					<ol
						className="text-sm text-gray-600 list-decimal list-inside space-y-2 ml-1"
						start={3}
					>
						<li>
							Tap{' '}
							<strong>
								&ldquo;Show More&rdquo;
							</strong>{' '}
							to reveal additional options
						</li>
						<li>
							Set <strong>Method</strong> to{' '}
							<InlineKbd>POST</InlineKbd>
						</li>
					</ol>
					<Warning>
						Replace{' '}
						<InlineKbd>{'<your-domain>'}</InlineKbd>{' '}
						with your actual Cloudflare Tunnel domain or
						server URL. The endpoint must be accessible from the
						internet.
					</Warning>
					<div className="pt-1">
						<button
							type="button"
							onClick={() => handleMarkComplete(3)}
							className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
						>
							{completedSteps.has(3)
								? 'Unmark as done'
								: 'Mark as done'}
						</button>
					</div>
				</Step>

				<Step
					number={4}
					title="Configure headers and request body"
					isActive={activeStep === 4}
					isCompleted={completedSteps.has(4)}
					onToggle={() => handleToggle(4)}
				>
					<p className="text-sm text-gray-600 font-medium mb-1">
						Headers
					</p>
					<p className="text-sm text-gray-600 mb-2">
						Add the following headers to the request:
					</p>
					<div className="overflow-hidden rounded-lg border border-gray-200">
						<table className="min-w-full text-sm">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-3 py-2 text-left font-medium text-gray-600">
										Header
									</th>
									<th className="px-3 py-2 text-left font-medium text-gray-600">
										Value
									</th>
								</tr>
							</thead>
							<tbody>
								<tr className="border-t border-gray-200">
									<td className="px-3 py-2 font-mono text-xs text-gray-800">
										Content-Type
									</td>
									<td className="px-3 py-2 font-mono text-xs text-gray-800">
										application/json
									</td>
								</tr>
								<tr className="border-t border-gray-200">
									<td className="px-3 py-2 font-mono text-xs text-gray-800">
										X-Api-Key
									</td>
									<td className="px-3 py-2 font-mono text-xs text-emerald-700">
										{'<your-api-key>'}
									</td>
								</tr>
							</tbody>
						</table>
					</div>

					<p className="text-sm text-gray-600 font-medium mb-1 mt-4">
						Request Body (JSON)
					</p>
					<p className="text-sm text-gray-600 mb-2">
						Set the request body to <strong>JSON</strong> with the
						following fields:
					</p>
					<CodeBlock>{JSON_BODY_EXAMPLE}</CodeBlock>

					<div className="overflow-hidden rounded-lg border border-gray-200 mt-3">
						<table className="min-w-full text-sm">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-3 py-2 text-left font-medium text-gray-600">
										Field
									</th>
									<th className="px-3 py-2 text-left font-medium text-gray-600">
										Value in Shortcuts
									</th>
									<th className="px-3 py-2 text-left font-medium text-gray-600">
										Description
									</th>
								</tr>
							</thead>
							<tbody>
								<tr className="border-t border-gray-200">
									<td className="px-3 py-2 font-mono text-xs text-gray-800">
										message
									</td>
									<td className="px-3 py-2 text-xs text-gray-700">
										Shortcut Input (the SMS body)
									</td>
									<td className="px-3 py-2 text-xs text-gray-500">
										Raw SMS text to be parsed
									</td>
								</tr>
								<tr className="border-t border-gray-200">
									<td className="px-3 py-2 font-mono text-xs text-gray-800">
										sender
									</td>
									<td className="px-3 py-2 text-xs text-gray-700">
										<InlineKbd>BANGKOKBANK</InlineKbd>
									</td>
									<td className="px-3 py-2 text-xs text-gray-500">
										Identifies which parser to use
									</td>
								</tr>
								<tr className="border-t border-gray-200">
									<td className="px-3 py-2 font-mono text-xs text-gray-800">
										receivedAt
									</td>
									<td className="px-3 py-2 text-xs text-gray-700">
										Current Date (ISO 8601 format)
									</td>
									<td className="px-3 py-2 text-xs text-gray-500">
										Timestamp when SMS was received
									</td>
								</tr>
							</tbody>
						</table>
					</div>

					<Tip>
						To set the <strong>message</strong> field, tap the field
						value area and select{' '}
						<strong>&ldquo;Shortcut Input&rdquo;</strong> from the
						variable list. This passes the SMS body automatically.
						For <strong>receivedAt</strong>, tap the field and choose{' '}
						<strong>&ldquo;Current Date&rdquo;</strong>, then set
						the format to <strong>ISO 8601</strong>.
					</Tip>
					<div className="pt-1">
						<button
							type="button"
							onClick={() => handleMarkComplete(4)}
							className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
						>
							{completedSteps.has(4)
								? 'Unmark as done'
								: 'Mark as done'}
						</button>
					</div>
				</Step>

				<Step
					number={5}
					title="Add a confirmation notification (optional)"
					isActive={activeStep === 5}
					isCompleted={completedSteps.has(5)}
					onToggle={() => handleToggle(5)}
				>
					<p className="text-sm text-gray-600 mb-2">
						Optionally, add a notification to confirm whether the
						transaction was imported successfully:
					</p>
					<ol className="text-sm text-gray-600 list-decimal list-inside space-y-2 ml-1">
						<li>
							After the &ldquo;Get Contents of URL&rdquo; action,
							tap <strong>&ldquo;Add Action&rdquo;</strong>
						</li>
						<li>
							Search for and add{' '}
							<InlineKbd>Show Notification</InlineKbd>
						</li>
						<li>
							Set the title to something like{' '}
							<InlineKbd>
								Finance Tracker
							</InlineKbd>
						</li>
						<li>
							Set the body to the output of the previous action
							(the server response), or a static message like{' '}
							<InlineKbd>
								Transaction imported
							</InlineKbd>
						</li>
					</ol>
					<Tip>
						You can also add an{' '}
						<strong>&ldquo;If&rdquo;</strong> action to show
						different notifications for success and failure based on
						the HTTP status code.
					</Tip>
					<div className="pt-1">
						<button
							type="button"
							onClick={() => handleMarkComplete(5)}
							className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
						>
							{completedSteps.has(5)
								? 'Unmark as done'
								: 'Mark as done'}
						</button>
					</div>
				</Step>

				<Step
					number={6}
					title="Test the automation"
					isActive={activeStep === 6}
					isCompleted={completedSteps.has(6)}
					onToggle={() => handleToggle(6)}
				>
					<p className="text-sm text-gray-600 mb-2">
						Verify everything works end-to-end:
					</p>
					<ol className="text-sm text-gray-600 list-decimal list-inside space-y-2 ml-1">
						<li>
							Open the shortcut you just created and tap{' '}
							<strong>&ldquo;Run&rdquo;</strong> (the play
							button) to test manually
						</li>
						<li>
							When prompted for input, paste a sample Bangkok
							Bank SMS like:
						</li>
					</ol>
					<CodeBlock>
						{
							'BBL: card *1234 spent 500.00 THB at 7-ELEVEN on 22/02/26 15:30 Bal 12,345.67'
						}
					</CodeBlock>
					<ol
						className="text-sm text-gray-600 list-decimal list-inside space-y-2 ml-1"
						start={3}
					>
						<li>
							Check the <strong>Transactions</strong> page in
							Finance Tracker to verify the transaction
							appeared
						</li>
						<li>
							If an error occurs, check the server logs or the{' '}
							<strong>SMS Import History</strong> in Settings for
							details
						</li>
					</ol>

					<Warning>
						If the test fails with a network error, verify that
						your Cloudflare Tunnel is running and the URL is
						correct. If you get a 401 error, double-check your API
						key.
					</Warning>

					<p className="text-sm text-gray-600 mt-3">
						Once the manual test works, wait for a real SMS from
						Bangkok Bank. The automation will trigger automatically
						and import the transaction.
					</p>
					<div className="pt-1">
						<button
							type="button"
							onClick={() => handleMarkComplete(6)}
							className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
						>
							{completedSteps.has(6)
								? 'Unmark as done'
								: 'Mark as done'}
						</button>
					</div>
				</Step>
			</div>

			{allCompleted && (
				<div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 animate-fade-in">
					<p className="font-medium">Setup complete!</p>
					<p className="text-emerald-700 mt-0.5">
						Your iPhone will now automatically forward Bangkok Bank
						SMS messages to Finance Tracker. Transactions will
						appear on the Transactions page shortly after each SMS
						is received.
					</p>
				</div>
			)}

			<details className="mt-4 group">
				<summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
					Troubleshooting
				</summary>
				<div className="mt-3 space-y-3 pl-1">
					<div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
						<table className="min-w-full text-sm">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-4 py-2 text-left font-medium text-gray-600 w-1/3">
										Problem
									</th>
									<th className="px-4 py-2 text-left font-medium text-gray-600">
										Solution
									</th>
								</tr>
							</thead>
							<tbody>
								<tr className="border-t border-gray-200">
									<td className="px-4 py-3 text-gray-700 align-top">
										Automation doesn&apos;t trigger
									</td>
									<td className="px-4 py-3 text-gray-600">
										Make sure the sender name in the
										automation matches exactly. Check
										Settings &gt; Notifications &gt;
										Messages to ensure notifications are
										enabled.
									</td>
								</tr>
								<tr className="border-t border-gray-200">
									<td className="px-4 py-3 text-gray-700 align-top">
										Network/connection error
									</td>
									<td className="px-4 py-3 text-gray-600">
										Verify your Cloudflare Tunnel is running
										and the URL is accessible. Test by
										opening the URL in Safari on your
										iPhone.
									</td>
								</tr>
								<tr className="border-t border-gray-200">
									<td className="px-4 py-3 text-gray-700 align-top">
										401 Unauthorized
									</td>
									<td className="px-4 py-3 text-gray-600">
										Your API key is invalid or revoked.
										Generate a new one from Settings &gt;
										API Keys and update the shortcut.
									</td>
								</tr>
								<tr className="border-t border-gray-200">
									<td className="px-4 py-3 text-gray-700 align-top">
										Transaction not created
									</td>
									<td className="px-4 py-3 text-gray-600">
										The SMS format may not be recognized by
										the parser. Check SMS Import History in
										Settings for the raw message and error
										details.
									</td>
								</tr>
								<tr className="border-t border-gray-200">
									<td className="px-4 py-3 text-gray-700 align-top">
										Duplicate transactions
									</td>
									<td className="px-4 py-3 text-gray-600">
										The server deduplicates by SMS content
										hash. If the same SMS is sent twice, the
										second one will be rejected. No action
										needed.
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</details>
		</section>
	)
}
