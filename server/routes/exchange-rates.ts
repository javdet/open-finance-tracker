/**
 * REST route for exchange rates (Frankfurter proxy).
 */
import { Router, type Request, type Response } from 'express'

const router = Router()

const FRANKFURTER_BASE_URL = 'https://api.frankfurter.dev/v1'

router.get('/latest', async (req: Request, res: Response) => {
	try {
		const base = (req.query.base as string | undefined) ?? 'USD'
		const symbols = req.query.symbols as string | undefined

		const url = new URL(`${FRANKFURTER_BASE_URL}/latest`)
		if (base) {
			url.searchParams.set('base', base)
		}
		if (symbols && symbols.trim() !== '') {
			url.searchParams.set('symbols', symbols)
		}

		const response = await fetch(url.toString())
		if (!response.ok) {
			console.error(
				'Frankfurter latest rates failed',
				response.status,
				response.statusText,
			)
			res.status(500).json({ error: 'Failed to fetch exchange rates' })
			return
		}

		const data = (await response.json()) as {
			base: string
			date: string
			rates: Record<string, number>
		}

		const { base: respBase, date, rates } = data

		res.json({
			base: respBase,
			date,
			rates,
		})
	} catch (err) {
		console.error('exchangeRatesLatest', err)
		res.status(500).json({ error: 'Failed to fetch exchange rates' })
	}
})

export default router

