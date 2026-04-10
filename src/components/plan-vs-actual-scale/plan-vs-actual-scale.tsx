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

/** How much of the plan has been used: (actual / plan) * 100. */
function usagePercent(plan: number, actual: number): number {
	if (plan === 0) return actual === 0 ? 0 : 100
	return (actual / plan) * 100
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
	/**
	 * When true, shows actual/plan usage percentage instead of closeness.
	 * The bar turns red when actual exceeds the plan (>100%).
	 */
	showUsage?: boolean
}

const DEFAULT_FILL_COLOR = '#22c55e'
const OVER_BUDGET_COLOR = '#ef4444'
const GLASS_HEIGHT_PX = 160

export function PlanVsActualScale({
	title,
	plan,
	actual,
	currencyCode,
	signed = false,
	fillColor = DEFAULT_FILL_COLOR,
	showUsage = false,
}: PlanVsActualScaleProps) {
	const pct = showUsage
		? usagePercent(plan, actual)
		: closenessPercent(plan, actual)
	const isOverBudget = showUsage && pct > 100
	const visualPct = Math.min(pct, 100)
	const fillHeightPx = (visualPct / 100) * GLASS_HEIGHT_PX
	const resolvedFillColor = isOverBudget ? OVER_BUDGET_COLOR : fillColor
	const formatVal = signed
		? (n: number) => formatSignedMoney(n, currencyCode)
		: (n: number) => formatMoney(n, currencyCode)
	const pctLabel = showUsage ? 'used' : 'match'

	return (
		<div className="flex flex-col rounded-lg border bg-surface-card p-4 shadow-sm">
			<h3 className="text-sm font-medium text-secondary mb-3">{title}</h3>
			<div className="flex items-end gap-3">
				<div
					className="flex flex-col justify-between text-xs text-muted shrink-0 py-0.5"
					style={{ height: GLASS_HEIGHT_PX }}
				>
					<span>100%</span>
					<span>0%</span>
				</div>
				<div
					className="w-px bg-surface-hover shrink-0"
					style={{ height: GLASS_HEIGHT_PX }}
					aria-hidden
				/>
				<div className="flex flex-col items-center flex-1">
					<div
						className="relative w-full max-w-[48px] rounded-b border-2 bg-surface overflow-hidden"
						style={{
							height: GLASS_HEIGHT_PX,
							borderColor: isOverBudget ? OVER_BUDGET_COLOR : undefined,
						}}
						role="img"
						aria-label={`${title}: ${Math.round(pct)}% ${pctLabel}. Plan ${formatVal(plan)}, actual ${formatVal(actual)}.`}
					>
						<div
							className="absolute left-0 right-0 bottom-0 rounded-b transition-all duration-300"
							style={{
								height: Math.max(fillHeightPx, 0),
								backgroundColor: resolvedFillColor,
							}}
							title={`${Math.round(pct)}% — Plan ${formatVal(plan)}, Actual ${formatVal(actual)}`}
						/>
					</div>
					<p className={`text-xs mt-2 text-center ${isOverBudget ? 'text-negative' : 'text-secondary'}`}>
						<span className="font-medium">{Math.round(pct)}%</span>
						<span className={isOverBudget ? 'text-negative' : 'text-muted'}> {pctLabel}</span>
					</p>
					<p className="text-xs text-muted mt-0.5">
						Plan {formatVal(plan)} · Actual {formatVal(actual)}
					</p>
				</div>
			</div>
		</div>
	)
}
