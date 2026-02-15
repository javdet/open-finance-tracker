/**
 * Simple class name combiner. Replace with clsx/classnames package if needed.
 */
export function clsx(...inputs: (string | undefined | false)[]): string {
	return inputs.filter(Boolean).join(' ')
}
