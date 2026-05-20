#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "🔄 API 서버 재시작..."

PID_FILE="$ROOT/logs/api.pid"
if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  kill "$PID" 2>/dev/null && echo "  기존 API 종료 (PID: $PID)" || true
  rm -f "$PID_FILE"
fi

EXISTING=$(lsof -ti :3100 2>/dev/null || true)
[ -n "$EXISTING" ] && kill -9 $EXISTING 2>/dev/null || true

sleep 2
echo ""
exec "$ROOT/scripts/start-api.sh"
