# Operations Table Partition Maintenance

This document describes the strategy and scripts for maintaining monthly range
partitions on the `operations` table and for archiving or removing old data.

## Overview

- **Partitioning key**: `operation_time` (RANGE, monthly).
- **Partition naming**: `operations_YYYY_MM` (e.g. `operations_2026_02`).
- **Default partition**: `operations_default` holds any rows that do not fall
  into an explicit monthly partition (past data and any month not yet created).

## Creating Future Partitions

### Strategy

- Create **monthly** partitions in advance so inserts never fall into the
  default partition for current/future months.
- **Horizon**: Create partitions for the next **6–12 months** from the current
  date. Recommended default: **12 months**.
- **Idempotency**: The maintenance script uses `CREATE TABLE IF NOT EXISTS …
  PARTITION OF operations …`, so it is safe to run daily or weekly; existing
  partitions are skipped.
- **Scheduling**: Run via cron (or a job scheduler) at least monthly;
  running weekly is recommended so new months are always covered.

### Scripts

- **SQL**: `db/scripts/maintain-operations-partitions.sql`  
  Creates monthly partitions for a configurable number of months ahead
  (default 12). Uses psql variable `months_ahead`.
- **Shell wrapper** (optional): `db/scripts/run-partition-maintenance.sh`  
  Sets `DATABASE_URL` and optionally `MONTHS_AHEAD`, then runs the SQL
  script. Suitable for cron.

**Run manually (SQL):**
```bash
psql "$DATABASE_URL" -v months_ahead=12 -f db/scripts/maintain-operations-partitions.sql
```

**Run via wrapper (e.g. cron):**
```bash
export DATABASE_URL='postgresql://...'
export MONTHS_AHEAD=12   # optional; default 12
./db/scripts/run-partition-maintenance.sh
```

**Cron example** (every Sunday at 02:00):
```cron
0 2 * * 0 cd /path/to/finance-tracker && DATABASE_URL='...' ./db/scripts/run-partition-maintenance.sh >> /var/log/partition-maintenance.log 2>&1
```

### Important notes

- The **default partition** must exist. Do not drop it; it catches any
  operation whose `operation_time` does not fall into a named partition.
- New rows whose `operation_time` falls in a month that has a dedicated
  partition will be stored in that partition; otherwise they go to the
  default partition.

## Archival and Retention of Old Partitions

### Strategy

- **Optional**: If you need to limit retention (e.g. keep only 2–5 years of
  data in the main table), you can periodically **detach** old monthly
  partitions and then either **archive** them or **drop** them.
- **Detach**: Removes the partition from the partitioned table; it becomes a
  standalone table. No data is deleted.
- **After detach**: Either:
  - **Archive**: Move the detached table to an archive schema and keep it for
    compliance or analytics, or export to cold storage and then drop the table.
  - **Drop**: `DROP TABLE …` if retention policy does not require keeping the
    data.

### When to create explicit past partitions

- Currently, all **past** data lives in `operations_default` because only
  future (and optionally current) months get explicit partitions.
- If you want to **archive by month**, you must first **split** the default
  partition: create a partition for a given past month and move rows from
  default into it (e.g. using a temporary table and `INSERT … SELECT` or
  `ALTER TABLE … ATTACH PARTITION` with a table that already contains the
  data). This is more involved and only needed if you need per-month archival.
- Simpler approach: Keep all past data in `operations_default` and only
  create future partitions. Then archival applies only if you later introduce
  explicit past partitions (e.g. by a one-time migration that creates and
  fills partitions for past months).

### Script for detaching (and optionally archiving)

- **Location**: `db/scripts/archive-operations-partition.sql`
- **Behaviour**: Detaches a given partition by name. Optionally moves it into
  an archive schema (the script creates the schema if missing).
- **Run manually** (detach only):
  ```bash
  psql "$DATABASE_URL" -v partition_to_detach=operations_2020_01 -f db/scripts/archive-operations-partition.sql
  ```
- **Run** (detach and move to archive schema):
  ```bash
  psql "$DATABASE_URL" -v partition_to_detach=operations_2020_01 -v archive_schema=archive -f db/scripts/archive-operations-partition.sql
  ```
- **Retention job**: If you have explicit past partitions (e.g. after a
  one-time backfill), a cron job can iterate over partition names older than
  N years and call this script for each.

## Summary

| Task                    | Script / action                                                                 |
|-------------------------|----------------------------------------------------------------------------------|
| Create future partitions| `maintain-operations-partitions.sql` (run regularly, e.g. weekly)              |
| Detach old partition    | `archive-operations-partition.sql` (run per partition when archiving/dropping)  |
| Cron example            | Weekly: `psql "$DATABASE_URL" -v months_ahead=12 -f db/scripts/maintain-operations-partitions.sql` |

No changes to the application layer are required; inserts and queries continue
to use the `operations` table. PostgreSQL routes rows to the correct partition
based on `operation_time`.
