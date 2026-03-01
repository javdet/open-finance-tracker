/**
 * Bootstrap auth: ensure a single user exists with password from env.
 * Run at server startup after DB is connected.
 * When RESET_CREDENTIALS=true, force-reset login and password to initial values.
 */
import argon2 from 'argon2'
import * as usersRepo from '../repositories/users.js'

function isResetCredentials(): boolean {
	const v = process.env.RESET_CREDENTIALS
	return v === 'true' || v === '1' || v === 'yes'
}

export async function bootstrapAuth(): Promise<void> {
	const login = process.env.INITIAL_LOGIN
	const password = process.env.INITIAL_PASSWORD

	if (!login || !password) {
		return
	}

	const passwordHash = await argon2.hash(password, { type: argon2.argon2id })
	const resetCredentials = isResetCredentials()

	if (resetCredentials) {
		const user = await usersRepo.getFirstUser()
		if (user) {
			await usersRepo.migrateToPasswordAuth(String(user.id), passwordHash)
			await usersRepo.updateEmail(String(user.id), login)
			return
		}
		await usersRepo.createUser({
			email: login,
			passwordHash,
			baseCurrencyCode: 'USD',
		})
		return
	}

	const existingByEmail = await usersRepo.findByEmail(login)
	if (existingByEmail) {
		if (existingByEmail.password_hash) {
			return
		}
		await usersRepo.migrateToPasswordAuth(
			String(existingByEmail.id),
			passwordHash,
		)
		return
	}

	const userWithoutPassword = await usersRepo.getFirstUserWithoutPassword()
	if (userWithoutPassword) {
		await usersRepo.migrateToPasswordAuth(
			String(userWithoutPassword.id),
			passwordHash,
		)
		await usersRepo.updateEmail(String(userWithoutPassword.id), login)
		return
	}

	const count = await usersRepo.getUserCount()
	if (count === 0) {
		await usersRepo.createUser({
			email: login,
			passwordHash,
			baseCurrencyCode: 'USD',
		})
	}
}
