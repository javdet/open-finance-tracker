import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
	TransactionTypeSelector,
	type TransactionTypeOption,
} from './transaction-type-selector'

describe('TransactionTypeSelector', () => {
	it('renders all three buttons', () => {
		render(<TransactionTypeSelector value="expense" onChange={() => {}} />)

		expect(screen.getByRole('button', { name: 'Income' })).toBeInTheDocument()
		expect(
			screen.getByRole('button', { name: 'Expense' }),
		).toBeInTheDocument()
		expect(
			screen.getByRole('button', { name: 'Transfer' }),
		).toBeInTheDocument()
	})

	it.each<TransactionTypeOption>(['income', 'expense', 'transfer'])(
		'calls onChange with "%s" when that button is clicked',
		async (type) => {
			const onChange = vi.fn()
			const user = userEvent.setup()

			render(<TransactionTypeSelector value="expense" onChange={onChange} />)

			const label = type.charAt(0).toUpperCase() + type.slice(1)
			await user.click(screen.getByRole('button', { name: label }))

			expect(onChange).toHaveBeenCalledOnce()
			expect(onChange).toHaveBeenCalledWith(type)
		},
	)

	it('marks the active button with aria-pressed="true"', () => {
		render(<TransactionTypeSelector value="income" onChange={() => {}} />)

		expect(screen.getByRole('button', { name: 'Income' })).toHaveAttribute(
			'aria-pressed',
			'true',
		)
		expect(screen.getByRole('button', { name: 'Expense' })).toHaveAttribute(
			'aria-pressed',
			'false',
		)
		expect(
			screen.getByRole('button', { name: 'Transfer' }),
		).toHaveAttribute('aria-pressed', 'false')
	})

	it('applies active styles to the selected button', () => {
		const { rerender } = render(
			<TransactionTypeSelector value="expense" onChange={() => {}} />,
		)

		expect(screen.getByRole('button', { name: 'Expense' }).className).toMatch(
			/border-red-500/,
		)
		expect(
			screen.getByRole('button', { name: 'Income' }).className,
		).not.toMatch(/border-green-500/)

		rerender(
			<TransactionTypeSelector value="transfer" onChange={() => {}} />,
		)

		expect(
			screen.getByRole('button', { name: 'Transfer' }).className,
		).toMatch(/border-blue-500/)
		expect(
			screen.getByRole('button', { name: 'Expense' }).className,
		).not.toMatch(/border-red-500/)
	})
})
