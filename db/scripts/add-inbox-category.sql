BEGIN;

-- Add 'skipped' value to sms_import_status enum
ALTER TYPE sms_import_status ADD VALUE IF NOT EXISTS 'skipped';

COMMIT;
