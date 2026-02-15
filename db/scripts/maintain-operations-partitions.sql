-- Create future monthly partitions for the operations table.
-- Run with: psql -v months_ahead=12 -f maintain-operations-partitions.sql
-- Default: 12 months ahead if months_ahead is not set.

\if :{?months_ahead}
\else
\set months_ahead 12
\endif

DO $$
DECLARE
	months_to_create int := :months_ahead;
	month_date       date;
	partition_name   text;
	from_bound       timestamptz;
	to_bound         timestamptz;
BEGIN
	IF months_to_create IS NULL OR months_to_create < 1 THEN
		months_to_create := 12;
	END IF;

	FOR month_date IN
		SELECT d::date
		FROM generate_series(
			date_trunc('month', current_date)::date,
			date_trunc('month', current_date)::date
				+ (months_to_create || ' months')::interval,
			'1 month'::interval
		) AS d
	LOOP
		partition_name := 'operations_' || to_char(month_date, 'YYYY_MM');
		from_bound     := month_date;
		to_bound       := month_date + interval '1 month';

		EXECUTE format(
			'CREATE TABLE IF NOT EXISTS %I PARTITION OF operations '
			'FOR VALUES FROM (%L) TO (%L)',
			partition_name,
			from_bound,
			to_bound
		);

		RAISE NOTICE 'Ensured partition % for % to %',
			partition_name, from_bound, to_bound;
	END LOOP;
END
$$;
