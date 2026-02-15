#!/usr/bin/env sh
# Run operations partition maintenance (create future monthly partitions).
# Set DATABASE_URL (connection string) and optionally MONTHS_AHEAD (default 12).
# Suitable for cron: 0 2 * * 0 /path/to/run-partition-maintenance.sh >> /var/log/partition-maintenance.log 2>&1

set -eu

SCRIPT_DIR="${SCRIPT_DIR:-$(cd "$(dirname "$0")" && pwd)}"
MONTHS_AHEAD="${MONTHS_AHEAD:-12}"

if [ -z "${DATABASE_URL:-}" ]; then
	echo 'DATABASE_URL is not set' >&2
	exit 1
fi

exec psql "$DATABASE_URL" -v months_ahead="$MONTHS_AHEAD" \
	-f "$SCRIPT_DIR/maintain-operations-partitions.sql"
