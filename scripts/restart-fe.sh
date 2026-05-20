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
pkill -f "vite.*4200\|vite.*4300\|vite.*4201\|vite.*4301" 2>/dev/null || true

sleep 1

for PORT in 4200 4201 4202 4300 4301 4302; do
  PIDS=$(lsof -ti :$PORT 2>/dev/null || true)
  [ -n "$PIDS" ] && kill -9 $PIDS 2>/dev/null || true
done

sleep 2
echo ""

echo "── Web 시작 ─────────────────────────"
"$ROOT/scripts/start-web.sh"

echo ""
echo "── Admin 시작 ───────────────────────"
"$ROOT/scripts/start-admin.sh"
