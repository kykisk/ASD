#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "🔄 프론트엔드 재시작 (Web + Admin)..."
echo ""

for SVC in web admin; do
  PORT=$( [ "$SVC" = "web" ] && echo 4200 || echo 4300 )
  PID_FILE="$ROOT/logs/$SVC.pid"
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    kill "$PID" 2>/dev/null && echo "  기존 $SVC 종료 (PID: $PID)" || true
    rm -f "$PID_FILE"
  fi
done

pkill -f "auticare.*vite" 2>/dev/null || true

sleep 1

for PORT in 4200 4201 4202 4300 4301; do
  PIDS=$(lsof -ti :$PORT 2>/dev/null || true)
  [ -n "$PIDS" ] && kill -9 $PIDS 2>/dev/null || true
done

sleep 1
echo ""

"$ROOT/scripts/start-web.sh" &
WEB_PID=$!
"$ROOT/scripts/start-admin.sh" &
ADMIN_PID=$!

wait $WEB_PID
wait $ADMIN_PID
