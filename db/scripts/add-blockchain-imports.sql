-- Blockchain wallet watch and import tables for automated on-chain
-- transaction tracking (Ethereum, Tron, Solana).
-- Run after schema.sql.

BEGIN;

-- =========================
-- Enum types
-- =========================

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_type
		WHERE typname = 'blockchain_chain'
	) THEN
		CREATE TYPE blockchain_chain AS ENUM (
			'ethereum',
			'tron',
			'solana'
		);
	END IF;
END$$;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_type
		WHERE typname = 'blockchain_import_status'
	) THEN
		CREATE TYPE blockchain_import_status AS ENUM (
			'processed',
			'failed',
			'skipped'
		);
	END IF;
END$$;

-- =========================
-- Wallet watches
-- =========================

CREATE TABLE IF NOT EXISTS wallet_watches (
	id                  BIGSERIAL          PRIMARY KEY,
	user_id             BIGINT             NOT NULL,
	chain               blockchain_chain   NOT NULL,
	wallet_address      TEXT               NOT NULL,
	account_id          BIGINT             NOT NULL,
	default_category_id BIGINT,
	is_active           BOOLEAN            NOT NULL DEFAULT TRUE,
	last_checked_at     TIMESTAMPTZ,
	last_block_number   BIGINT,
	created_at          TIMESTAMPTZ        NOT NULL DEFAULT NOW(),

	CONSTRAINT wallet_watches_address_not_empty_check
		CHECK (length(trim(wallet_address)) > 0),
	CONSTRAINT wallet_watches_user_fk
		FOREIGN KEY (user_id)
		REFERENCES users (id)
		ON DELETE CASCADE,
	CONSTRAINT wallet_watches_account_fk
		FOREIGN KEY (account_id)
		REFERENCES accounts (id)
		ON DELETE CASCADE,
	CONSTRAINT wallet_watches_category_fk
		FOREIGN KEY (default_category_id)
		REFERENCES categories (id)
		ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS wallet_watches_user_idx
	ON wallet_watches (user_id);

CREATE INDEX IF NOT EXISTS wallet_watches_active_idx
	ON wallet_watches (is_active)
	WHERE is_active = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS wallet_watches_user_chain_address_unique
	ON wallet_watches (user_id, chain, wallet_address);

-- =========================
-- Blockchain imports
-- =========================

CREATE TABLE IF NOT EXISTS blockchain_imports (
	id                BIGSERIAL                PRIMARY KEY,
	user_id           BIGINT                   NOT NULL,
	wallet_watch_id   BIGINT                   NOT NULL,
	tx_hash           TEXT                     NOT NULL,
	chain             blockchain_chain         NOT NULL,
	from_address      TEXT                     NOT NULL,
	to_address        TEXT                     NOT NULL,
	token_symbol      TEXT                     NOT NULL,
	amount            NUMERIC(28,8)            NOT NULL,
	block_number      BIGINT                   NOT NULL,
	block_timestamp   TIMESTAMPTZ              NOT NULL,
	operation_id      BIGINT,
	status            blockchain_import_status NOT NULL DEFAULT 'processed',
	error_message     TEXT,
	raw_data          JSONB,
	created_at        TIMESTAMPTZ              NOT NULL DEFAULT NOW(),

	CONSTRAINT blockchain_imports_tx_hash_not_empty_check
		CHECK (length(trim(tx_hash)) > 0),
	CONSTRAINT blockchain_imports_chain_tx_unique
		UNIQUE (chain, tx_hash),
	CONSTRAINT blockchain_imports_user_fk
		FOREIGN KEY (user_id)
		REFERENCES users (id)
		ON DELETE CASCADE,
	CONSTRAINT blockchain_imports_wallet_watch_fk
		FOREIGN KEY (wallet_watch_id)
		REFERENCES wallet_watches (id)
		ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS blockchain_imports_user_idx
	ON blockchain_imports (user_id);

CREATE INDEX IF NOT EXISTS blockchain_imports_wallet_watch_idx
	ON blockchain_imports (wallet_watch_id);

CREATE INDEX IF NOT EXISTS blockchain_imports_user_status_idx
	ON blockchain_imports (user_id, status);

CREATE INDEX IF NOT EXISTS blockchain_imports_chain_tx_idx
	ON blockchain_imports (chain, tx_hash);

COMMIT;
