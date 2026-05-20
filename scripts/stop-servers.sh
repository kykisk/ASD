#!/bin/bash

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "🛑 AutiCare 서버 종료 중..."

for SVC in api web admin; do
  PID_FILE="$ROOT/logs/$SVC.pid"
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    kill "$PID" 2>/dev/null && echo "  ✅ $SVC 종료 (PID: $PID)" || true
    rm -f "$PID_FILE"
  fi
done

pkill -f "auticare.*vite" 2>/dev/null || true
pkill -f "nx.*serve" 2>/dev/null || true

sleep 1

for PORT in 3100 4200 4201 4202 4300 4301; do
  PIDS=$(lsof -ti :$PORT 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    kill -9 $PIDS 2>/dev/null && echo "  ✅ 포트 $PORT 해제" || true
  fi
done

echo ""
echo "✨ 완료"
