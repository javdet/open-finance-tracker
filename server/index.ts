/**
 * Finance tracker API server.
 * Data access layer: accounts, operations, budgets; budget vs actual report.
 * Set DATABASE_URL (e.g. postgres://user:pass@localhost:5432/finance_tracker).
 * Auth: session-based login; INITIAL_LOGIN, INITIAL_PASSWORD, SESSION_SECRET env vars.
 */
import path from 'path'
import express from 'express'
import session from 'express-session'
import connectPgSimple from 'connect-pg-simple'
import cors from 'cors'
import accountsRoutes from './routes/accounts.js'
import operationsRoutes from './routes/operations.js'
import budgetsRoutes from './routes/budgets.js'
import budgetReportsRoutes from './routes/budget-reports.js'
import budgetTemplatesRoutes from './routes/budget-templates.js'
import categoriesRoutes from './routes/categories.js'
import exchangeRatesRoutes from './routes/exchange-rates.js'
import scheduledTransactionsRoutes from './routes/scheduled-transactions.js'
import apiKeysRoutes from './routes/api-keys.js'
import smsAccountMappingsRoutes from './routes/sms-account-mappings.js'
import smsImportsRoutes from './routes/sms-imports.js'
import smsWebhookRoutes from './routes/sms-webhook.js'
import authRoutes from './routes/auth.js'
import './services/sms-parsers/register.js'
import { getPool } from './db/client.js'
import { sessionAuth } from './middleware/session-auth.js'
import { bootstrapAuth } from './bootstrap/auth.js'

const app = express()
const PORT = Number(process.env.PORT) || 3001
const isProduction = process.env.NODE_ENV === 'production'

const PgSession = connectPgSimple(session)
const sessionSecret = process.env.SESSION_SECRET || 'dev-secret-change-in-production'
// When served over HTTP (no HTTPS), set SESSION_SECURE_COOKIE=false so the browser stores the cookie
const secureCookie =
	isProduction &&
	process.env.SESSION_SECURE_COOKIE !== 'false' &&
	process.env.SESSION_SECURE_COOKIE !== '0'

app.use(
	cors({
		origin: true,
		credentials: true,
	}),
)
app.use(express.json())
app.use(
	session({
		store: new PgSession({
			pool: getPool(),
			createTableIfMissing: true,
		}),
		secret: sessionSecret,
		resave: false,
		saveUninitialized: false,
		cookie: {
			httpOnly: true,
			secure: secureCookie,
			sameSite: 'lax',
			maxAge: 24 * 60 * 60 * 1000,
		},
	}),
)

app.use('/api/auth', authRoutes)
app.use('/api/accounts', sessionAuth, accountsRoutes)
app.use('/api/operations', sessionAuth, operationsRoutes)
app.use('/api/budgets', sessionAuth, budgetsRoutes)
app.use('/api/budgets', sessionAuth, budgetReportsRoutes)
app.use('/api/budget-templates', sessionAuth, budgetTemplatesRoutes)
app.use('/api/categories', sessionAuth, categoriesRoutes)
app.use('/api/exchange-rates', sessionAuth, exchangeRatesRoutes)
app.use('/api/scheduled-transactions', sessionAuth, scheduledTransactionsRoutes)
app.use('/api/api-keys', sessionAuth, apiKeysRoutes)
app.use('/api/sms-account-mappings', sessionAuth, smsAccountMappingsRoutes)
app.use('/api/sms-imports', sessionAuth, smsImportsRoutes)
app.use('/api/sms-webhook', smsWebhookRoutes)

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
	} catch {
		console.error('DATABASE_URL is not set or invalid. Exiting.')
		process.exit(1)
	}
	await bootstrapAuth()
	const host = isProduction ? '0.0.0.0' : 'localhost'
	app.listen(PORT, host, () => {
		console.log(`Finance tracker API listening on http://${host}:${PORT}`)
	})
}

start().catch((error) => {
	console.error(error)
	process.exit(1)
})
