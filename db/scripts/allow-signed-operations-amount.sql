-- Allow signed amounts in operations: negative for payments (expense),
-- positive for income and transfer. Drop the strict positive-only check.
-- Run once on existing databases (e.g. psql $DATABASE_URL -f db/scripts/allow-signed-operations-amount.sql).

BEGIN;

ALTER TABLE operations
	DROP CONSTRAINT IF EXISTS operations_amount_positive_check;

ALTER TABLE operations
	ADD CONSTRAINT operations_amount_non_zero_check
	CHECK (amount <> 0);

COMMIT;
