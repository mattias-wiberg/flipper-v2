#!/usr/bin/env bash
# Restore an Umami dump into a scratch database on the Umami PostgreSQL
# instance, for a restore rehearsal or a pre-restore check.
# Runbook: docs/umami.md ("Backup, Restore, and Restore Rehearsal").
#
# This script NEVER restores over the live `umami` database: the target name
# must start with `umami_rehearsal`, and the target is dropped and recreated.
#
# Usage: scripts/restore-umami.sh <dump-file> [scratch-database]
#   scratch-database defaults to `umami_rehearsal`.
#
# Environment:
#   UMAMI_DB_VOLUME     database volume name
#                       (default: umami-analytics-9zaxkp_umami-db-data)
#   UMAMI_DB_CONTAINER  database container
#                       (default: discovered from the volume)
set -euo pipefail

DEFAULT_VOLUME="umami-analytics-9zaxkp_umami-db-data"

fail() {
  printf 'error: %s\n' "$*" >&2
  exit 1
}

[ "$#" -ge 1 ] && [ "$#" -le 2 ] || fail "usage: $0 <dump-file> [scratch-database]"
dump="$1"
scratch="${2:-umami_rehearsal}"

case "$scratch" in
  umami_rehearsal*) ;;
  *) fail "refusing to target '$scratch': the scratch database name must start with 'umami_rehearsal'; this script never restores over the live 'umami' database" ;;
esac
case "$scratch" in
  *[!a-z0-9_]*) fail "scratch database name may contain only lowercase letters, digits, and underscores" ;;
esac

[ -f "$dump" ] || fail "dump file not found: $dump"
command -v docker >/dev/null 2>&1 || fail "docker is required"

if [ -f "$dump.sha256" ]; then
  if command -v sha256sum >/dev/null 2>&1; then
    (cd "$(dirname "$dump")" && sha256sum -c "$(basename "$dump").sha256") >/dev/null ||
      fail "checksum verification failed for $dump"
  else
    expected="$(cut -d' ' -f1 <"$dump.sha256")"
    actual="$(shasum -a 256 "$dump" | cut -d' ' -f1)"
    [ "$expected" = "$actual" ] || fail "checksum verification failed for $dump"
  fi
fi

volume="${UMAMI_DB_VOLUME:-$DEFAULT_VOLUME}"
container="${UMAMI_DB_CONTAINER:-}"
if [ -z "$container" ]; then
  container="$(docker ps -q --filter "volume=$volume" | sed -n '1p')"
fi
[ -n "$container" ] || fail "no running container mounts volume $volume; set UMAMI_DB_CONTAINER"

docker exec "$container" psql -U umami -d postgres -v ON_ERROR_STOP=1 -q \
  -c "DROP DATABASE IF EXISTS \"$scratch\" WITH (FORCE)" \
  -c "CREATE DATABASE \"$scratch\"" >/dev/null ||
  fail "cannot create scratch database $scratch"

docker exec -i "$container" pg_restore -U umami -d "$scratch" \
  --no-owner --no-privileges --single-transaction <"$dump" ||
  fail "pg_restore failed; scratch database $scratch may be incomplete"

counts_sql="SELECT
  (SELECT count(*) FROM website_event WHERE event_type = 1),
  (SELECT count(DISTINCT url_path) FROM website_event WHERE event_type = 1),
  (SELECT count(*) FROM website),
  (SELECT coalesce(min(created_at)::text, '-') FROM website_event WHERE event_type = 1),
  (SELECT coalesce(max(created_at)::text, '-') FROM website_event WHERE event_type = 1);"

printf 'columns: pageviews | urls | websites | first_event | last_event\n'
docker exec "$container" psql -U umami -d umami -F ' | ' -Atc "$counts_sql" |
  sed 's/^/live    /'
docker exec "$container" psql -U umami -d "$scratch" -F ' | ' -Atc "$counts_sql" |
  sed 's/^/scratch /'

printf '\ntop restored URLs (%s):\n' "$scratch"
docker exec "$container" psql -U umami -d "$scratch" -F ' | ' -Atc \
  "SELECT url_path, count(*) FROM website_event WHERE event_type = 1 GROUP BY url_path ORDER BY count(*) DESC, url_path LIMIT 5"

cat <<EOF

Compare the scratch counts with the counts printed when the dump was taken:
page views recorded since then legitimately raise the live count. Next: verify
the restored data in Umami (docs/umami.md, "Full rehearsal") and complete
docs/umami-restore-rehearsal-record.md. Clean up with:
  docker exec $container psql -U umami -d postgres -c 'DROP DATABASE "$scratch" WITH (FORCE)'
EOF
