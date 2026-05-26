#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "🔄 Expo Web 서버 재시작..."

PID_FILE="$ROOT/logs/mobile.pid"
if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  kill "$PID" 2>/dev/null && echo "  기존 Expo 종료 (PID: $PID)" || true
  rm -f "$PID_FILE"
fi

PIDS=$(lsof -ti :8081 2>/dev/null || true)
[ -n "$PIDS" ] && kill -9 $PIDS 2>/dev/null || true

sleep 2
echo ""
exec "$ROOT/scripts/start-mobile.sh"
