#!/usr/bin/env bash
# scripts/restart-dev.sh — Quick restart dev server with clean webpack cache
# Usage: bash scripts/restart-dev.sh
# This kills the dev server, cleans webpack cache, restarts on port 3000.

set -e

echo "🔧 Restarting dev server (clean)..."

# Kill existing dev server
PID=$(pgrep -f "next dev" 2>/dev/null || true)
if [ -n "$PID" ]; then
  echo "  Killing PID $PID..."
  kill "$PID" 2>/dev/null || true
  sleep 2
fi

# Clean webpack cache
echo "  Cleaning .next/ cache..."
rm -rf "$(dirname "$0")/../.next" "$(dirname "$0")/../node_modules/.cache"

# Restart
echo "  Starting dev server on port 3000..."
nohup npx next dev -p 3000 > /tmp/next-dev.log 2>&1 &
NEW_PID=$!
echo "  PID: $NEW_PID"

# Wait for server to be ready
echo "  Waiting for server..."
for i in $(seq 1 30); do
  if curl -s -o /dev/null http://localhost:3000 2>/dev/null; then
    echo "✅ Dev server ready (PID $NEW_PID) — http://localhost:3000"
    exit 0
  fi
  sleep 1
done

echo "❌ Server did not start within 30 seconds. Check /tmp/next-dev.log"
exit 1
