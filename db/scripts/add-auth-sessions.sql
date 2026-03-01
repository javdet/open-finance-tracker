-- Session table for connect-pg-simple (express-session store).
-- Run after schema.sql. Ensures USD exists for user bootstrap.
-- Idempotent: creates table only if missing.

BEGIN;

-- Ensure USD currency exists (required for user creation)
INSERT INTO currencies (code, name, symbol, decimal_places)
VALUES ('USD', 'US Dollar', '$', 2)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS "session" (
	"sid" varchar NOT NULL,
	"sess" json NOT NULL,
	"expire" timestamp(6) NOT NULL
);

ALTER TABLE "session" DROP CONSTRAINT IF EXISTS "session_pkey";
ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid");

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

COMMIT;
