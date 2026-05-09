#!/bin/bash
# GeoRevolt — PostgreSQL Migration Runner for Neon
# Usage: bash scripts/run-migrations.sh "postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/georevolt?sslmode=require"
# Or pipe to psql directly:
#   psql "$DATABASE_URL" -f scripts/migrations/003_sprint5.sql

set -e

DATABASE_URL="${1:-$DATABASE_URL}"

if [ -z "$DATABASE_URL" ]; then
  echo "❌ Usage: $0 <postgresql-connection-string>"
  echo "   or set DATABASE_URL environment variable"
  exit 1
fi

echo "=== GeoRevolt Migration Runner ==="
echo "Target: $(echo $DATABASE_URL | sed 's|://[^:]*:[^@]*@|://user:pass@|')"
echo ""

MIGRATIONS_DIR="$(dirname "$0")/migrations"

for f in "$MIGRATIONS_DIR"/*.sql; do
  echo "→ Applying $(basename "$f")..."
  if psql "$DATABASE_URL" -f "$f" -q 2>/dev/null; then
    echo "  ✅ $(basename "$f") applied"
  else
    echo "  ⚠️  Error on $(basename "$f") — check if already applied"
  fi
done

echo ""
echo "=== Migrations complete ==="
echo ""
echo "Verify with:"
echo "  psql \"$DATABASE_URL\" -c '\\dt'"
echo "  psql \"$DATABASE_URL\" -c '\\d markets'"
