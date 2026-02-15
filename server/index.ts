/**
 * Finance tracker API server.
 * Data access layer: accounts, operations, budgets; budget vs actual report.
 * Set DATABASE_URL (e.g. postgres://user:pass@localhost:5432/finance_tracker).
 * Optional: X-User-Id header or ?userId= for multi-user (default user id 1).
 */
import path from 'path'
import express from 'express'
import cors from 'cors'
import accountsRoutes from './routes/accounts.js'
import operationsRoutes from './routes/operations.js'
import budgetsRoutes from './routes/budgets.js'
import budgetReportsRoutes from './routes/budget-reports.js'
import categoriesRoutes from './routes/categories.js'
import exchangeRatesRoutes from './routes/exchange-rates.js'
import { getPool } from './db/client.js'

const app = express()
const PORT = Number(process.env.PORT) || 3001
const isProduction = process.env.NODE_ENV === 'production'

app.use(cors())
app.use(express.json())

app.use('/api/accounts', accountsRoutes)
app.use('/api/operations', operationsRoutes)
app.use('/api/budgets', budgetsRoutes)
app.use('/api/budgets', budgetReportsRoutes)
app.use('/api/categories', categoriesRoutes)
app.use('/api/exchange-rates', exchangeRatesRoutes)

app.get('/api/health', (_req, res) => {
	res.json({ status: 'ok' })
})

if (isProduction) {
	const distPath = path.join(process.cwd(), 'dist')
	app.use(express.static(distPath))
	app.get('*', (_req, res) => {
		res.sendFile(path.join(distPath, 'index.html'))
	})
}

async function start() {
	try {
		getPool()
	} catch (err) {
		console.error('DATABASE_URL is not set or invalid. Exiting.')
		process.exit(1)
	}
	const host = isProduction ? '0.0.0.0' : 'localhost'
	app.listen(PORT, host, () => {
		console.log(`Finance tracker API listening on http://${host}:${PORT}`)
	})
}

start().catch((err) => {
	console.error(err)
	process.exit(1)
})
