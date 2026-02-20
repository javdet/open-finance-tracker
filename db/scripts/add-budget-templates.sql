-- Budget templates: reusable plans without dates.
-- Apply a template to a month to copy its items into that month's budget.
-- Run after schema.sql (and add-thb-and-crypto-currencies.sql if used).

BEGIN;

-- =========================
-- Budget templates
-- =========================

CREATE TABLE IF NOT EXISTS budget_templates (
	id                  BIGSERIAL     PRIMARY KEY,
	user_id             BIGINT        NOT NULL,
	name                TEXT          NOT NULL,
	base_currency_code  VARCHAR(10)   NOT NULL,
	created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

	CONSTRAINT budget_templates_name_not_empty_check
		CHECK (length(trim(name)) > 0),
	CONSTRAINT budget_templates_user_fk
		FOREIGN KEY (user_id)
		REFERENCES users (id)
		ON DELETE CASCADE,
	CONSTRAINT budget_templates_base_currency_fk
		FOREIGN KEY (base_currency_code)
		REFERENCES currencies (code)
);

CREATE INDEX IF NOT EXISTS budget_templates_user_idx
	ON budget_templates (user_id);

-- =========================
-- Budget template items
-- =========================

CREATE TABLE IF NOT EXISTS budget_template_items (
	id              BIGSERIAL     PRIMARY KEY,
	template_id     BIGINT        NOT NULL,
	category_id     BIGINT        NOT NULL,
	planned_amount  NUMERIC(18,2) NOT NULL,
	account_id      BIGINT,
	created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

	CONSTRAINT budget_template_items_planned_amount_positive_check
		CHECK (planned_amount > 0),
	CONSTRAINT budget_template_items_template_fk
		FOREIGN KEY (template_id)
		REFERENCES budget_templates (id)
		ON DELETE CASCADE,
	CONSTRAINT budget_template_items_category_fk
		FOREIGN KEY (category_id)
		REFERENCES categories (id)
		ON DELETE CASCADE,
	CONSTRAINT budget_template_items_account_fk
		FOREIGN KEY (account_id)
		REFERENCES accounts (id)
		ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS budget_template_items_template_idx
	ON budget_template_items (template_id);

CREATE INDEX IF NOT EXISTS budget_template_items_category_idx
	ON budget_template_items (category_id);

CREATE INDEX IF NOT EXISTS budget_template_items_account_idx
	ON budget_template_items (account_id)
	WHERE account_id IS NOT NULL;

COMMIT;
