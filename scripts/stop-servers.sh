#!/bin/bash

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "🛑 AutiCare 서버 종료 중..."

for SVC in api web admin; do
  PID_FILE="$ROOT/logs/$SVC.pid"
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    kill "$PID" 2>/dev/null && echo "  ✅ $SVC 종료 (PID: $PID)" || echo "  ℹ️  $SVC 이미 종료됨"
    rm -f "$PID_FILE"
  fi
done

for PORT in 3100 4200 4300; do
  PIDS=$(lsof -ti :$PORT 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    kill -9 $PIDS 2>/dev/null && echo "  ✅ 포트 $PORT 해제" || true
  fi
done

echo ""
echo "✨ 완료"
