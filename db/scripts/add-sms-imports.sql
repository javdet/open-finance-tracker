-- SMS auto-import tables: API keys for webhook auth, raw SMS audit log,
-- and account mappings to resolve card/account digits to finance-tracker accounts.
-- Run after schema.sql.

BEGIN;

-- =========================
-- API keys (SMS webhook auth)
-- =========================

CREATE TABLE IF NOT EXISTS api_keys (
	id          BIGSERIAL    PRIMARY KEY,
	user_id     BIGINT       NOT NULL,
	key_hash    TEXT         NOT NULL,
	label       TEXT         NOT NULL,
	is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
	created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

	CONSTRAINT api_keys_label_not_empty_check
		CHECK (length(trim(label)) > 0),
	CONSTRAINT api_keys_user_fk
		FOREIGN KEY (user_id)
		REFERENCES users (id)
		ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS api_keys_user_idx
	ON api_keys (user_id);

CREATE INDEX IF NOT EXISTS api_keys_hash_idx
	ON api_keys (key_hash)
	WHERE is_active = TRUE;

-- =========================
-- SMS imports (raw SMS audit log)
-- =========================

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_type
		WHERE typname = 'sms_import_status'
	) THEN
		CREATE TYPE sms_import_status AS ENUM (
			'pending',
			'processed',
			'failed',
			'duplicate'
		);
	END IF;
END$$;

CREATE TABLE IF NOT EXISTS sms_imports (
	id              BIGSERIAL          PRIMARY KEY,
	user_id         BIGINT             NOT NULL,
	raw_message     TEXT               NOT NULL,
	sender          TEXT,
	received_at     TIMESTAMPTZ,
	parser_used     TEXT,
	parsed_data     JSONB,
	operation_id    BIGINT,
	status          sms_import_status  NOT NULL DEFAULT 'pending',
	error_message   TEXT,
	message_hash    TEXT               NOT NULL,
	created_at      TIMESTAMPTZ        NOT NULL DEFAULT NOW(),

	CONSTRAINT sms_imports_unique_hash
		UNIQUE (user_id, message_hash),
	CONSTRAINT sms_imports_user_fk
		FOREIGN KEY (user_id)
		REFERENCES users (id)
		ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS sms_imports_user_idx
	ON sms_imports (user_id);

CREATE INDEX IF NOT EXISTS sms_imports_user_status_idx
	ON sms_imports (user_id, status);

-- =========================
-- SMS account mappings
-- =========================

CREATE TABLE IF NOT EXISTS sms_account_mappings (
	id                  BIGSERIAL   PRIMARY KEY,
	user_id             BIGINT      NOT NULL,
	card_last4          VARCHAR(4),
	account_last4       VARCHAR(4),
	account_id          BIGINT      NOT NULL,
	default_category_id BIGINT,

	CONSTRAINT sms_account_mappings_has_identifier_check
		CHECK (card_last4 IS NOT NULL OR account_last4 IS NOT NULL),
	CONSTRAINT sms_account_mappings_unique
		UNIQUE (user_id, card_last4, account_last4),
	CONSTRAINT sms_account_mappings_user_fk
		FOREIGN KEY (user_id)
		REFERENCES users (id)
		ON DELETE CASCADE,
	CONSTRAINT sms_account_mappings_account_fk
		FOREIGN KEY (account_id)
		REFERENCES accounts (id)
		ON DELETE CASCADE,
	CONSTRAINT sms_account_mappings_category_fk
		FOREIGN KEY (default_category_id)
		REFERENCES categories (id)
		ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS sms_account_mappings_user_idx
	ON sms_account_mappings (user_id);

COMMIT;
