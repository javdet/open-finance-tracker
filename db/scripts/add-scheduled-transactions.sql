-- Scheduled transactions: recurring payments/incomes used for budget planning.
-- Run after schema.sql.

BEGIN;

-- =========================
-- Recurrence period enum
-- =========================

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_type
		WHERE typname = 'recurrence_period'
	) THEN
		CREATE TYPE recurrence_period AS ENUM (
			'daily',
			'weekly',
			'biweekly',
			'monthly',
			'quarterly',
			'yearly'
		);
	END IF;
END$$;

-- =========================
-- Scheduled transactions
-- =========================

CREATE TABLE IF NOT EXISTS scheduled_transactions (
	id                  BIGSERIAL         PRIMARY KEY,
	user_id             BIGINT            NOT NULL,
	name                TEXT              NOT NULL,
	operation_type      operation_type    NOT NULL,
	category_id         BIGINT,
	account_id          BIGINT            NOT NULL,
	transfer_account_id BIGINT,
	amount              NUMERIC(18,2)     NOT NULL,
	currency_code       VARCHAR(10)       NOT NULL,
	recurrence_period   recurrence_period NOT NULL,
	start_date          DATE              NOT NULL DEFAULT CURRENT_DATE,
	notify_payment      BOOLEAN           NOT NULL DEFAULT FALSE,
	is_active           BOOLEAN           NOT NULL DEFAULT TRUE,
	notes               TEXT,
	created_at          TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
	updated_at          TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

	CONSTRAINT scheduled_transactions_name_not_empty_check
		CHECK (length(trim(name)) > 0),
	CONSTRAINT scheduled_transactions_amount_non_zero_check
		CHECK (amount <> 0),
	CONSTRAINT scheduled_transactions_transfer_check
		CHECK (
			(operation_type = 'transfer'
				AND transfer_account_id IS NOT NULL
				AND transfer_account_id <> account_id)
			OR (
				operation_type IN ('payment', 'income')
				AND transfer_account_id IS NULL
			)
		),
	CONSTRAINT scheduled_transactions_category_presence_check
		CHECK (
			(operation_type = 'transfer' AND category_id IS NULL)
			OR (
				operation_type IN ('payment', 'income')
				AND category_id IS NOT NULL
			)
		),
	CONSTRAINT scheduled_transactions_user_fk
		FOREIGN KEY (user_id)
		REFERENCES users (id)
		ON DELETE CASCADE,
	CONSTRAINT scheduled_transactions_account_fk
		FOREIGN KEY (account_id)
		REFERENCES accounts (id),
	CONSTRAINT scheduled_transactions_transfer_account_fk
		FOREIGN KEY (transfer_account_id)
		REFERENCES accounts (id),
	CONSTRAINT scheduled_transactions_category_fk
		FOREIGN KEY (category_id)
		REFERENCES categories (id),
	CONSTRAINT scheduled_transactions_currency_fk
		FOREIGN KEY (currency_code)
		REFERENCES currencies (code)
);

CREATE INDEX IF NOT EXISTS scheduled_transactions_user_idx
	ON scheduled_transactions (user_id);

CREATE INDEX IF NOT EXISTS scheduled_transactions_user_active_idx
	ON scheduled_transactions (user_id, is_active)
	WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS scheduled_transactions_user_category_idx
	ON scheduled_transactions (user_id, category_id)
	WHERE category_id IS NOT NULL;

-- Back-fill for databases that already have the table without start_date
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_name = 'scheduled_transactions'
		  AND column_name = 'start_date'
	) THEN
		ALTER TABLE scheduled_transactions
			ADD COLUMN start_date DATE NOT NULL DEFAULT CURRENT_DATE;
	END IF;
END$$;

COMMIT;
