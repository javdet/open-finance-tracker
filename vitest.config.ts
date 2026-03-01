import path from 'path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
	test: {
		projects: [
			{
				extends: true,
				test: {
					name: 'frontend',
					environment: 'jsdom',
					globals: true,
					include: ['src/**/*.test.{ts,tsx}'],
					setupFiles: ['src/test-setup.ts'],
				},
			},
			{
				test: {
					name: 'backend',
					environment: 'node',
					include: ['server/**/*.test.ts'],
				},
			},
		],
	},
})
