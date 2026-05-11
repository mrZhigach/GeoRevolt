#!/bin/bash
# GeoRevolt — Kill process on specified port
# Usage: bash scripts/kill-port.sh [port=3000]
set -e

PORT=${1:-3000}
echo "🔍 Checking port $PORT..."

PID=$(lsof -ti :"$PORT" 2>/dev/null || true)

if [ -z "$PID" ]; then
  echo "✅ Port $PORT is free — nothing to kill"
  exit 0
fi

echo "⚠️  Port $PORT is in use by PID(s): $PID"
echo "Killing process(es)..."
kill -9 $PID 2>/dev/null || true
sleep 1

if lsof -ti :"$PORT" > /dev/null 2>&1; then
  echo "❌ Failed to kill process on port $PORT"
  exit 1
else
  echo "✅ Port $PORT is now free"
fi
