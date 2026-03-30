-- Migration: add poll_interval_ms column and unique account constraint
-- Run after schema.sql on existing deployments.

ALTER TABLE wallet_watches
	ADD COLUMN IF NOT EXISTS poll_interval_ms INTEGER NOT NULL DEFAULT 3600000;

ALTER TABLE wallet_watches
	ADD CONSTRAINT wallet_watches_poll_interval_check
		CHECK (poll_interval_ms >= 60000)
	NOT VALID;

ALTER TABLE wallet_watches VALIDATE CONSTRAINT wallet_watches_poll_interval_check;

CREATE UNIQUE INDEX IF NOT EXISTS wallet_watches_account_unique
	ON wallet_watches (account_id);
