export type TransactionTypeOption = 'expense' | 'income' | 'transfer'

interface TransactionTypeSelectorProps {
	value: TransactionTypeOption
	onChange: (value: TransactionTypeOption) => void
}

const baseBtn =
	'flex items-center justify-center w-10 h-10 rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-emerald-500'

/** Green up arrow = Income, red down arrow = Expense, blue cross arrows = Transfer */
export function TransactionTypeSelector({
	value,
	onChange,
}: TransactionTypeSelectorProps) {
	const incomeClass =
		value === 'income'
			? `${baseBtn} border-green-500 bg-green-50 text-green-600`
			: `${baseBtn} border-gray-200 bg-white text-gray-400 hover:border-green-300 hover:bg-green-50/50`
	const expenseClass =
		value === 'expense'
			? `${baseBtn} border-red-500 bg-red-50 text-red-600`
			: `${baseBtn} border-gray-200 bg-white text-gray-400 hover:border-red-300 hover:bg-red-50/50`
	const transferClass =
		value === 'transfer'
			? `${baseBtn} border-blue-500 bg-blue-50 text-blue-600`
			: `${baseBtn} border-gray-200 bg-white text-gray-400 hover:border-blue-300 hover:bg-blue-50/50`

	return (
		<div className="flex items-center gap-1">
			<button
				type="button"
				onClick={() => onChange('income')}
				title="Income"
				className={incomeClass}
				aria-pressed={value === 'income'}
				aria-label="Income"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden
				>
					<path d="M12 19V5" />
					<path d="m5 12 7-7 7 7" />
				</svg>
			</button>
			<button
				type="button"
				onClick={() => onChange('expense')}
				title="Expense"
				className={expenseClass}
				aria-pressed={value === 'expense'}
				aria-label="Expense"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden
				>
					<path d="M12 5v14" />
					<path d="m19 12-7 7-7-7" />
				</svg>
			</button>
			<button
				type="button"
				onClick={() => onChange('transfer')}
				title="Transfer"
				className={transferClass}
				aria-pressed={value === 'transfer'}
				aria-label="Transfer"
			>
				{/* Two cross arrows (exchange/transfer) */}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden
				>
					<path d="M7 12h10" />
					<path d="M4 8 7 12 4 16" />
					<path d="M20 16l-3-4 3-4" />
				</svg>
			</button>
		</div>
	)
}
