-- Add THB currency and support for crypto currencies (USDT, USDC).
-- For crypto-type accounts, currency must be USDT or USDC.
-- Seed default expense and income categories for every existing user.
-- Run this after schema.sql on existing databases.

BEGIN;

-- Widen currency code to allow 4-letter codes (USDT, USDC)
ALTER TABLE currencies
	ALTER COLUMN code TYPE VARCHAR(10);

ALTER TABLE users
	ALTER COLUMN base_currency_code TYPE VARCHAR(10);

ALTER TABLE accounts
	ALTER COLUMN currency_code TYPE VARCHAR(10);

ALTER TABLE exchange_rates
	ALTER COLUMN base_currency_code TYPE VARCHAR(10),
	ALTER COLUMN counter_currency_code TYPE VARCHAR(10);

ALTER TABLE operations
	ALTER COLUMN currency_code TYPE VARCHAR(10);

ALTER TABLE budgets
	ALTER COLUMN base_currency_code TYPE VARCHAR(10);

-- Insert all fiat and crypto currencies used in the app (ignore if already present)
INSERT INTO currencies (code, name, symbol, decimal_places)
VALUES
	('USD', 'US Dollar', '$', 2),
	('EUR', 'Euro', '€', 2),
	('GBP', 'British Pound', '£', 2),
	('THB', 'Thai Baht', '฿', 2),
	('RUB', 'Russian Ruble', '₽', 2),
	('USDT', 'Tether', 'USDT', 2),
	('USDC', 'USD Coin', 'USDC', 2)
ON CONFLICT (code) DO NOTHING;

-- Ensure a default user exists (id = 1) so the app can create accounts
INSERT INTO users (email, external_auth_id, base_currency_code)
SELECT 'default@local', 'default', 'USD'
WHERE NOT EXISTS (SELECT 1 FROM users LIMIT 1);

-- Crypto accounts may only use USDT or USDC (idempotent: drop then add)
ALTER TABLE accounts
	DROP CONSTRAINT IF EXISTS accounts_crypto_currency_check;
ALTER TABLE accounts
	ADD CONSTRAINT accounts_crypto_currency_check
		CHECK (
			account_type <> 'crypto'
			OR currency_code IN ('USDT', 'USDC')
		);

-- =========================
-- Default category groups and categories (for every existing user)
-- =========================

INSERT INTO category_groups (user_id, name, direction)
SELECT u.id, 'Expenses', 'expense'
FROM users u
ON CONFLICT (user_id, name) DO NOTHING;

INSERT INTO category_groups (user_id, name, direction)
SELECT u.id, 'Income', 'income'
FROM users u
ON CONFLICT (user_id, name) DO NOTHING;

-- Expense categories (one set per user that has the Expenses group)
INSERT INTO categories (user_id, group_id, name, direction)
SELECT g.user_id, g.id, v.name, 'expense'
FROM category_groups g
CROSS JOIN (VALUES
	('Bad habits'),
	('Household'),
	('Pets'),
	('Deliveries'),
	('Medicine'),
	('Insurance'),
	('Recreation and leisure'),
	('Food'),
	('Transportation'),
	('Subscriptions'),
	('Sports'),
	('Utilities'),
	('Clothing'),
	('Work expenses'),
	('Communications, TV, and Internet')
) AS v(name)
WHERE g.name = 'Expenses'
ON CONFLICT (user_id, name, direction) DO NOTHING;

-- Income categories (one set per user that has the Income group)
INSERT INTO categories (user_id, group_id, name, direction)
SELECT g.user_id, g.id, v.name, 'income'
FROM category_groups g
CROSS JOIN (VALUES
	('Personal income'),
	('Investment income'),
	('Other income')
) AS v(name)
WHERE g.name = 'Income'
ON CONFLICT (user_id, name, direction) DO NOTHING;

COMMIT;
