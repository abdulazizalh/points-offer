#!/usr/bin/env bash
# Spins up a throwaway local PostgreSQL, applies migrations + seed, runs SQL tests.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
root="$here/.."
PG_BIN="${PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
tmp="$(mktemp -d /tmp/masar-pg.XXXXXX)"
port=$((50000 + RANDOM % 10000))
run() { if [ "$(id -u)" = "0" ]; then su postgres -s /bin/bash -c "$*"; else bash -c "$*"; fi; }
cleanup() { run "$PG_BIN/pg_ctl -D $tmp/data stop -m fast" >/dev/null 2>&1 || true; rm -rf -- "$tmp"; }
trap cleanup EXIT
[ "$(id -u)" = "0" ] && chown postgres "$tmp"
run "$PG_BIN/initdb -D $tmp/data -A trust -U postgres >/dev/null"
run "$PG_BIN/pg_ctl -D $tmp/data -o '-p $port -k $tmp' -l $tmp/log start >/dev/null" || { cat "$tmp/log"; exit 1; }
sleep 2
PSQL="psql -h $tmp -p $port -U postgres -v ON_ERROR_STOP=1 -q"
$PSQL -c "create database masar"
for f in "$here/auth_shim.sql" "$root"/migrations/*.sql "$root/seed.sql" "$here/queue_engine_test.sql"; do
  echo "→ $(basename "$f")"
  $PSQL -d masar -o /dev/null -f "$f"
done
