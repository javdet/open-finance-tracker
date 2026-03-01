/**
 * Single vertical scale (glass): the closer actual is to plan, the higher the fill.
 * 100% full = plan matches actual exactly.
 */

function formatMoney(amount: number, currencyCode: string): string {
	try {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: currencyCode,
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		}).format(amount)
	} catch {
		return `${amount.toLocaleString()} ${currencyCode}`
	}
}

function formatSignedMoney(amount: number, currencyCode: string): string {
	const formatted = formatMoney(Math.abs(amount), currencyCode)
	return amount < 0 ? `−${formatted}` : formatted
}

/**
 * Closeness of actual to plan as 0–100%.
 * 100% when actual === plan; decreases as |actual - plan| increases.
 */
function closenessPercent(plan: number, actual: number): number {
	const denom = Math.max(Math.abs(plan), Math.abs(actual), 1)
	const gap = Math.abs(actual - plan)
	return Math.max(0, 100 * (1 - gap / denom))
}

export interface PlanVsActualScaleProps {
	title: string
	plan: number
	actual: number
	currencyCode: string
	/** Whether values can be negative (e.g. balance); formats with minus sign. */
	signed?: boolean
	/** Fill color for the "water" in the glass. */
	fillColor?: string
}

const DEFAULT_FILL_COLOR = '#22c55e'
const GLASS_HEIGHT_PX = 160

export function PlanVsActualScale({
	title,
	plan,
	actual,
	currencyCode,
	signed = false,
	fillColor = DEFAULT_FILL_COLOR,
}: PlanVsActualScaleProps) {
	const fillPct = closenessPercent(plan, actual)
	const fillHeightPx = (fillPct / 100) * GLASS_HEIGHT_PX
	const formatVal = signed ? (n: number) => formatSignedMoney(n, currencyCode) : (n: number) => formatMoney(n, currencyCode)

	return (
		<div className="flex flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
			<h3 className="text-sm font-medium text-gray-700 mb-3">{title}</h3>
			<div className="flex items-end gap-3">
				{/* Vertical scale: 100% at top, 0% at bottom */}
				<div
					className="flex flex-col justify-between text-xs text-gray-500 shrink-0 py-0.5"
					style={{ height: GLASS_HEIGHT_PX }}
				>
					<span>100%</span>
					<span>0%</span>
				</div>
				<div
					className="w-px bg-gray-200 shrink-0"
					style={{ height: GLASS_HEIGHT_PX }}
					aria-hidden
				/>
				{/* Single glass: outline + fill from bottom */}
				<div className="flex flex-col items-center flex-1">
					<div
						className="relative w-full max-w-[48px] rounded-b border-2 border-gray-200 bg-gray-50 overflow-hidden"
						style={{ height: GLASS_HEIGHT_PX }}
						role="img"
						aria-label={`${title}: ${Math.round(fillPct)}% match. Plan ${formatVal(plan)}, actual ${formatVal(actual)}.`}
					>
						<div
							className="absolute left-0 right-0 bottom-0 rounded-b transition-all duration-300"
							style={{
								height: Math.max(fillHeightPx, 0),
								backgroundColor: fillColor,
							}}
							title={`${Math.round(fillPct)}% — Plan ${formatVal(plan)}, Actual ${formatVal(actual)}`}
						/>
					</div>
					<p className="text-xs text-gray-600 mt-2 text-center">
						<span className="font-medium">{Math.round(fillPct)}%</span>
						<span className="text-gray-500"> match</span>
					</p>
					<p className="text-xs text-gray-500 mt-0.5">
						Plan {formatVal(plan)} · Actual {formatVal(actual)}
					</p>
				</div>
			</div>
		</div>
	)
}
