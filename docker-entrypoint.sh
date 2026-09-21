#!/bin/sh
set -eu

node /app/validate-production-env.mjs
exec "$@"
