#!/bin/sh
set -eu

node /app/scripts/validate-production-env.mjs
exec "$@"
