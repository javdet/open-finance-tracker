/** @type {import('tailwindcss').Config} */
export default {
	content: [
		'./index.html',
		'./src/**/*.{js,ts,jsx,tsx}',
	],
	darkMode: 'class',
	theme: {
		extend: {
			colors: {
				surface: {
					DEFAULT: 'rgb(var(--color-surface) / <alpha-value>)',
					card: 'rgb(var(--color-surface-card) / <alpha-value>)',
					alt: 'rgb(var(--color-surface-alt) / <alpha-value>)',
					hover: 'rgb(var(--color-surface-hover) / <alpha-value>)',
				},
				primary: 'rgb(var(--color-text-primary) / <alpha-value>)',
				secondary: 'rgb(var(--color-text-secondary) / <alpha-value>)',
				muted: 'rgb(var(--color-text-muted) / <alpha-value>)',
				faint: 'rgb(var(--color-text-faint) / <alpha-value>)',
				positive: 'rgb(var(--color-positive) / <alpha-value>)',
				negative: 'rgb(var(--color-negative) / <alpha-value>)',
				warning: 'rgb(var(--color-warning) / <alpha-value>)',
				'nav-active': 'rgb(var(--color-nav-active) / <alpha-value>)',
			},
			borderColor: {
				DEFAULT: 'rgb(var(--color-border) / <alpha-value>)',
				subtle: 'rgb(var(--color-border-subtle) / <alpha-value>)',
				strong: 'rgb(var(--color-border-strong) / <alpha-value>)',
			},
		},
	},
	plugins: [],
}
