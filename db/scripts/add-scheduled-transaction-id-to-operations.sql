-- Add scheduled_transaction_id column to operations table.
-- Links an operation to a scheduled transaction to track paid/unpaid status.

BEGIN;

ALTER TABLE operations
	ADD COLUMN IF NOT EXISTS scheduled_transaction_id BIGINT
	REFERENCES scheduled_transactions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS operations_scheduled_transaction_id_idx
	ON operations (scheduled_transaction_id)
	WHERE scheduled_transaction_id IS NOT NULL;

COMMIT;
