-- Core Postgres schema for finance-tracker
-- Defines users, accounts, categories, category_groups, currencies,
-- exchange_rates, operations, budgets, and budget_items tables with
-- keys, constraints, and enums.

BEGIN;

-- =========================
-- Enum types
-- =========================

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_type
		WHERE typname = 'account_type'
	) THEN
		CREATE TYPE account_type AS ENUM (
			'cash',
			'card',
			'bank',
			'investment',
			'loan',
			'crypto',
			'other'
		);
	END IF;
END$$;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_type
		WHERE typname = 'category_group_direction'
	) THEN
		CREATE TYPE category_group_direction AS ENUM (
			'income',
			'expense',
			'both'
		);
	END IF;
END$$;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_type
		WHERE typname = 'category_direction'
	) THEN
		CREATE TYPE category_direction AS ENUM (
			'income',
			'expense'
		);
	END IF;
END$$;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_type
		WHERE typname = 'gender_type'
	) THEN
		CREATE TYPE gender_type AS ENUM (
			'male',
			'female',
			'other',
			'unspecified'
		);
	END IF;
END$$;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_type
		WHERE typname = 'operation_type'
	) THEN
		CREATE TYPE operation_type AS ENUM (
			'payment',
			'income',
			'transfer'
		);
	END IF;
END$$;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_type
		WHERE typname = 'period_type'
	) THEN
		CREATE TYPE period_type AS ENUM (
			'month',
			'week',
			'custom'
		);
	END IF;
END$$;

-- =========================
-- Currencies
-- =========================

CREATE TABLE IF NOT EXISTS currencies (
	code            VARCHAR(10) PRIMARY KEY,
	name            TEXT        NOT NULL,
	symbol          TEXT,
	decimal_places  SMALLINT    NOT NULL DEFAULT 2,

	CONSTRAINT currencies_decimal_places_check
		CHECK (decimal_places >= 0 AND decimal_places <= 8),
	CONSTRAINT currencies_code_upper_check
		CHECK (code = UPPER(code))
);

-- =========================
-- Users
-- =========================

CREATE TABLE IF NOT EXISTS users (
	id                  BIGSERIAL      PRIMARY KEY,
	email               TEXT           NOT NULL,
	password_hash       TEXT,
	external_auth_id    TEXT,
	nickname            TEXT,
	gender              gender_type    NOT NULL DEFAULT 'unspecified',
	birth_date          DATE,
	base_currency_code  VARCHAR(10)    NOT NULL,
	created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

	CONSTRAINT users_email_not_empty_check
		CHECK (length(trim(email)) > 0),
	CONSTRAINT users_auth_presence_check
		CHECK (
			password_hash IS NOT NULL
			OR external_auth_id IS NOT NULL
		),
	CONSTRAINT users_base_currency_fk
		FOREIGN KEY (base_currency_code)
		REFERENCES currencies (code)
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique
	ON users (LOWER(email));

-- =========================
-- Accounts
-- =========================

CREATE TABLE IF NOT EXISTS accounts (
	id              BIGSERIAL     PRIMARY KEY,
	user_id         BIGINT        NOT NULL,
	name            TEXT          NOT NULL,
	account_type    account_type  NOT NULL,
	description     TEXT,
	currency_code   VARCHAR(10)   NOT NULL,
	initial_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
	is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
	created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

	CONSTRAINT accounts_name_not_empty_check
		CHECK (length(trim(name)) > 0),
	CONSTRAINT accounts_crypto_currency_check
		CHECK (
			account_type <> 'crypto'
			OR currency_code IN ('USDT', 'USDC')
		),
	CONSTRAINT accounts_user_fk
		FOREIGN KEY (user_id)
		REFERENCES users (id)
		ON DELETE CASCADE,
	CONSTRAINT accounts_currency_fk
		FOREIGN KEY (currency_code)
		REFERENCES currencies (code)
);

CREATE INDEX IF NOT EXISTS accounts_user_idx
	ON accounts (user_id);

CREATE UNIQUE INDEX IF NOT EXISTS accounts_user_name_unique
	ON accounts (user_id, name);

-- =========================
-- Category groups
-- =========================

CREATE TABLE IF NOT EXISTS category_groups (
	id         BIGSERIAL               PRIMARY KEY,
	user_id    BIGINT                  NOT NULL,
	name       TEXT                    NOT NULL,
	direction  category_group_direction NOT NULL
	                                      DEFAULT 'expense',

	CONSTRAINT category_groups_name_not_empty_check
		CHECK (length(trim(name)) > 0),
	CONSTRAINT category_groups_user_fk
		FOREIGN KEY (user_id)
		REFERENCES users (id)
		ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS category_groups_user_idx
	ON category_groups (user_id);

CREATE UNIQUE INDEX IF NOT EXISTS category_groups_user_name_unique
	ON category_groups (user_id, name);

-- =========================
-- Categories
-- =========================

CREATE TABLE IF NOT EXISTS categories (
	id                 BIGSERIAL          PRIMARY KEY,
	user_id            BIGINT             NOT NULL,
	group_id           BIGINT,
	parent_category_id BIGINT,
	name               TEXT               NOT NULL,
	direction          category_direction NOT NULL,
	description        TEXT,
	is_active          BOOLEAN            NOT NULL DEFAULT TRUE,

	CONSTRAINT categories_name_not_empty_check
		CHECK (length(trim(name)) > 0),
	CONSTRAINT categories_user_fk
		FOREIGN KEY (user_id)
		REFERENCES users (id)
		ON DELETE CASCADE,
	CONSTRAINT categories_group_fk
		FOREIGN KEY (group_id)
		REFERENCES category_groups (id)
		ON DELETE SET NULL,
	CONSTRAINT categories_parent_fk
		FOREIGN KEY (parent_category_id)
		REFERENCES categories (id)
		ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS categories_user_idx
	ON categories (user_id);

CREATE INDEX IF NOT EXISTS categories_user_direction_active_idx
	ON categories (user_id, direction, is_active);

CREATE UNIQUE INDEX IF NOT EXISTS categories_user_name_direction_unique
	ON categories (user_id, name, direction);

-- =========================
-- Exchange rates
-- =========================

CREATE TABLE IF NOT EXISTS exchange_rates (
	id                     BIGSERIAL   PRIMARY KEY,
	rate_date              DATE        NOT NULL,
	base_currency_code     VARCHAR(10) NOT NULL,
	counter_currency_code  VARCHAR(10) NOT NULL,
	rate                   NUMERIC(18,8) NOT NULL,
	created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

	CONSTRAINT exchange_rates_rate_positive_check
		CHECK (rate > 0),
	CONSTRAINT exchange_rates_base_currency_fk
		FOREIGN KEY (base_currency_code)
		REFERENCES currencies (code),
	CONSTRAINT exchange_rates_counter_currency_fk
		FOREIGN KEY (counter_currency_code)
		REFERENCES currencies (code),
	CONSTRAINT exchange_rates_no_self_pair_check
		CHECK (base_currency_code <> counter_currency_code)
);

CREATE UNIQUE INDEX IF NOT EXISTS exchange_rates_unique_pair_per_date
	ON exchange_rates (
		rate_date,
		base_currency_code,
		counter_currency_code
	);

-- =========================
-- Operations (partitioned)
-- =========================

CREATE TABLE IF NOT EXISTS operations (
	id                  BIGSERIAL,
	user_id             BIGINT          NOT NULL,
	operation_type      operation_type  NOT NULL,
	operation_time      TIMESTAMPTZ     NOT NULL,
	account_id          BIGINT          NOT NULL,
	transfer_account_id BIGINT,
	category_id         BIGINT,
	amount              NUMERIC(18,2)   NOT NULL,
	currency_code       VARCHAR(10)     NOT NULL,
	amount_in_base      NUMERIC(18,2),
	notes               TEXT,
	created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

	CONSTRAINT operations_pk
		PRIMARY KEY (id, operation_time),
	CONSTRAINT operations_amount_non_zero_check
		CHECK (amount <> 0),
	CONSTRAINT operations_transfer_accounts_check
		CHECK (
			(operation_type = 'transfer'
				AND transfer_account_id IS NOT NULL
				AND transfer_account_id <> account_id)
			OR (
				operation_type IN ('payment', 'income')
				AND transfer_account_id IS NULL
			)
		),
	CONSTRAINT operations_category_presence_check
		CHECK (
			(operation_type = 'transfer' AND category_id IS NULL)
			OR (
				operation_type IN ('payment', 'income')
				AND category_id IS NOT NULL
			)
		),
	CONSTRAINT operations_user_fk
		FOREIGN KEY (user_id)
		REFERENCES users (id)
		ON DELETE CASCADE,
	CONSTRAINT operations_account_fk
		FOREIGN KEY (account_id)
		REFERENCES accounts (id),
	CONSTRAINT operations_transfer_account_fk
		FOREIGN KEY (transfer_account_id)
		REFERENCES accounts (id),
	CONSTRAINT operations_category_fk
		FOREIGN KEY (category_id)
		REFERENCES categories (id),
	CONSTRAINT operations_currency_fk
		FOREIGN KEY (currency_code)
		REFERENCES currencies (code)
) PARTITION BY RANGE (operation_time);

CREATE TABLE IF NOT EXISTS operations_default
	PARTITION OF operations DEFAULT;

CREATE INDEX IF NOT EXISTS operations_user_operation_time_idx
	ON operations (user_id, operation_time);

CREATE INDEX IF NOT EXISTS operations_user_category_operation_time_idx
	ON operations (user_id, category_id, operation_time);

CREATE INDEX IF NOT EXISTS operations_user_account_operation_time_idx
	ON operations (user_id, account_id, operation_time);

-- =========================
-- Budgets
-- =========================

CREATE TABLE IF NOT EXISTS budgets (
	id              BIGSERIAL   PRIMARY KEY,
	user_id         BIGINT      NOT NULL,
	name            TEXT        NOT NULL,
	period_type     period_type NOT NULL,
	start_date      DATE        NOT NULL,
	end_date        DATE        NOT NULL,
	base_currency_code VARCHAR(10) NOT NULL,
	notes           TEXT,
	created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

	CONSTRAINT budgets_name_not_empty_check
		CHECK (length(trim(name)) > 0),
	CONSTRAINT budgets_date_range_check
		CHECK (end_date >= start_date),
	CONSTRAINT budgets_user_fk
		FOREIGN KEY (user_id)
		REFERENCES users (id)
		ON DELETE CASCADE,
	CONSTRAINT budgets_base_currency_fk
		FOREIGN KEY (base_currency_code)
		REFERENCES currencies (code)
);

CREATE INDEX IF NOT EXISTS budgets_user_idx
	ON budgets (user_id);

CREATE INDEX IF NOT EXISTS budgets_user_date_range_idx
	ON budgets (user_id, start_date, end_date);

-- =========================
-- Budget items
-- =========================

CREATE TABLE IF NOT EXISTS budget_items (
	id              BIGSERIAL     PRIMARY KEY,
	budget_id       BIGINT        NOT NULL,
	category_id     BIGINT        NOT NULL,
	planned_amount  NUMERIC(18,2) NOT NULL,
	account_id      BIGINT,
	created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

	CONSTRAINT budget_items_planned_amount_positive_check
		CHECK (planned_amount > 0),
	CONSTRAINT budget_items_budget_fk
		FOREIGN KEY (budget_id)
		REFERENCES budgets (id)
		ON DELETE CASCADE,
	CONSTRAINT budget_items_category_fk
		FOREIGN KEY (category_id)
		REFERENCES categories (id)
		ON DELETE CASCADE,
	CONSTRAINT budget_items_account_fk
		FOREIGN KEY (account_id)
		REFERENCES accounts (id)
		ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS budget_items_budget_idx
	ON budget_items (budget_id);

CREATE INDEX IF NOT EXISTS budget_items_category_idx
	ON budget_items (category_id);

CREATE INDEX IF NOT EXISTS budget_items_account_idx
	ON budget_items (account_id)
	WHERE account_id IS NOT NULL;

COMMIT;

