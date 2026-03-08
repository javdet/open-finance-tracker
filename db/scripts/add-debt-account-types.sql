-- Add credit_card and mortgage values to account_type enum
-- for debt account tracking (credit cards, mortgages).
-- Run after schema.sql.

BEGIN;

ALTER TYPE account_type ADD VALUE IF NOT EXISTS 'credit_card';
ALTER TYPE account_type ADD VALUE IF NOT EXISTS 'mortgage';

COMMIT;
