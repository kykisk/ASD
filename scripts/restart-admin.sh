#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "🔄 Admin 서버 재시작..."

PID_FILE="$ROOT/logs/admin.pid"
if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  kill "$PID" 2>/dev/null && echo "  기존 Admin 종료 (PID: $PID)" || true
  rm -f "$PID_FILE"
fi

for PORT in 4300 4301 4302; do
  PIDS=$(lsof -ti :$PORT 2>/dev/null || true)
  [ -n "$PIDS" ] && kill -9 $PIDS 2>/dev/null || true
done

sleep 2
echo ""
exec "$ROOT/scripts/start-admin.sh"
