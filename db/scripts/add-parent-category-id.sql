-- Add parent_category_id so categories can be nested under a top-level (system) category.
-- Run this on existing databases that were created before this column existed.

ALTER TABLE categories
	ADD COLUMN IF NOT EXISTS parent_category_id BIGINT REFERENCES categories (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS categories_parent_category_id_idx
	ON categories (parent_category_id);
