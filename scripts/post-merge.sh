#!/bin/bash
set -e
pnpm install --frozen-lockfile

DB_CONFIG="artifacts/api-server/data/db-config.json"
if [ -f "$DB_CONFIG" ]; then
  DB_URL=$(node -e "const d=JSON.parse(require('fs').readFileSync('$DB_CONFIG','utf8'));console.log(d.url||'')" 2>/dev/null || true)
fi
if [ -z "$DATABASE_URL" ] && [ -n "$DB_URL" ]; then
  export DATABASE_URL="$DB_URL"
fi

if [ -n "$DATABASE_URL" ]; then
  pnpm --filter db push
else
  echo "No DATABASE_URL available — skipping schema push (will run on next deploy)"
fi
