-- Add transfer_amount column to operations table.
-- Stores the received amount in the destination account's currency
-- for cross-currency transfers. NULL means same-currency (fallback to -amount).
-- Run after schema.sql.

BEGIN;

ALTER TABLE operations
	ADD COLUMN IF NOT EXISTS transfer_amount NUMERIC(18,2);

COMMIT;
