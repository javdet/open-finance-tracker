-- Detach a monthly partition from the operations table.
-- Optionally move it to an archive schema (schema is created if missing).
--
-- Run (detach only):
--   psql -v partition_to_detach=operations_2020_01 -f archive-operations-partition.sql
--
-- Run (detach and move to archive schema):
--   psql -v partition_to_detach=operations_2020_01 -v archive_schema=archive -f archive-operations-partition.sql

\if :{?archive_schema}
\else
\set archive_schema ''
\endif

DO $$
DECLARE
	part_name   text := :'partition_to_detach';
	arch_schema text := trim(:'archive_schema');
BEGIN
	IF part_name IS NULL OR length(trim(part_name)) = 0 THEN
		RAISE EXCEPTION 'partition_to_detach must be set (e.g. operations_2020_01)';
	END IF;

	IF NOT EXISTS (
		SELECT 1
		FROM pg_class c
		JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE n.nspname = 'public'
		  AND c.relname = part_name
		  AND c.relispartition
	) THEN
		RAISE EXCEPTION 'Partition % does not exist or is not a partition of operations',
			part_name;
	END IF;

	EXECUTE format('ALTER TABLE operations DETACH PARTITION %I', part_name);
	RAISE NOTICE 'Detached partition %', part_name;

	IF length(arch_schema) > 0 THEN
		EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', arch_schema);
		EXECUTE format('ALTER TABLE %I SET SCHEMA %I', part_name, arch_schema);
		RAISE NOTICE 'Moved partition to schema % as %.%', arch_schema, arch_schema, part_name;
	END IF;
END
$$;
