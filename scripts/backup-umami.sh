#!/usr/bin/env bash
# Umami logical backup on the Docker host.
# Runbook: docs/umami.md ("Backup, Restore, and Restore Rehearsal").
#
# Writes a PostgreSQL custom-format dump plus a SHA-256 sidecar into an
# operator-owned directory OUTSIDE this repository, verifies that the archive
# is readable, and prints the counts a restore rehearsal compares. Never
# commit a dump: it contains user password hashes, encrypted 2FA secrets, and
# page-view URLs.
#
# Usage: scripts/backup-umami.sh <destination-directory>
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

[ "$#" -eq 1 ] || fail "usage: $0 <destination-directory>"
dest="$1"

command -v docker >/dev/null 2>&1 || fail "docker is required"
[ -d "$dest" ] || fail "destination directory does not exist: $dest"

dest_abs="$(cd "$dest" && pwd -P)"
if repo="$(git -C "$dest_abs" rev-parse --show-toplevel 2>/dev/null)"; then
  repo_abs="$(cd "$repo" && pwd -P)"
  case "$dest_abs" in
    "$repo_abs" | "$repo_abs"/*)
      fail "destination is inside the repository ($repo_abs); dumps must never be committed"
      ;;
  esac
fi

volume="${UMAMI_DB_VOLUME:-$DEFAULT_VOLUME}"
container="${UMAMI_DB_CONTAINER:-}"
if [ -z "$container" ]; then
  container="$(docker ps -q --filter "volume=$volume" | sed -n '1p')"
fi
[ -n "$container" ] || fail "no running container mounts volume $volume; set UMAMI_DB_CONTAINER"

query() {
  docker exec "$container" psql -U umami -d umami -Atc "$1"
}

pageviews="$(query 'SELECT count(*) FROM website_event WHERE event_type = 1')" ||
  fail "cannot read the page-view count"
urls="$(query 'SELECT count(DISTINCT url_path) FROM website_event WHERE event_type = 1')" ||
  fail "cannot read the URL count"
websites="$(query 'SELECT count(*) FROM website')" ||
  fail "cannot read the website count"
first_event="$(query "SELECT coalesce(min(created_at)::text, '-') FROM website_event WHERE event_type = 1")" ||
  fail "cannot read the page-view range"
last_event="$(query "SELECT coalesce(max(created_at)::text, '-') FROM website_event WHERE event_type = 1")" ||
  fail "cannot read the page-view range"
top_urls="$(query "SELECT url_path || ' | ' || count(*) FROM website_event WHERE event_type = 1 GROUP BY url_path ORDER BY count(*) DESC, url_path LIMIT 5")" ||
  fail "cannot read the top URLs"

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
dump="$dest_abs/umami-$stamp.dump"
partial="$dump.partial"
trap 'rm -f "$partial"' EXIT

# umask keeps the dump and its sidecar private to the operator account.
(
  umask 077
  docker exec "$container" pg_dump -U umami -d umami \
    --format=custom --no-owner --no-privileges >"$partial"
)
[ -s "$partial" ] || fail "pg_dump produced an empty file"
docker exec -i "$container" pg_restore --list <"$partial" >/dev/null ||
  fail "the dump is not a readable custom-format archive"
mv "$partial" "$dump"
trap - EXIT

if command -v sha256sum >/dev/null 2>&1; then
  digest="$(sha256sum "$dump" | cut -d' ' -f1)"
else
  digest="$(shasum -a 256 "$dump" | cut -d' ' -f1)"
fi
printf '%s  %s\n' "$digest" "$(basename "$dump")" >"$dump.sha256"
chmod 600 "$dump" "$dump.sha256"

cat <<EOF
backup:    $dump
sha256:    $digest
pageviews: $pageviews
urls:      $urls
websites:  $websites
first:     $first_event
last:      $last_event
top URLs (path | page views):
$top_urls

Next: copy this file and its .sha256 sidecar to the recorded off-host
destination, then record the backup (file name, checksum, size, creation time,
and these counts as the restore-rehearsal reference).
EOF
