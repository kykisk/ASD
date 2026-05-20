#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="$HOME/.local/node_modules/.bin:$HOME/.local/bin:$ROOT/node_modules/.bin:$PATH"
export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"

LOG="$ROOT/logs/admin.log"
PID_FILE="$ROOT/logs/admin.pid"

mkdir -p "$ROOT/logs"

if ! command -v pnpm &>/dev/null; then
  echo "❌ pnpm을 찾을 수 없습니다."
  exit 1
fi

if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE")
  kill "$OLD_PID" 2>/dev/null && echo "  이전 Admin 프로세스 종료 (PID: $OLD_PID)" || true
  rm -f "$PID_FILE"
  sleep 1
fi

EXISTING=$(lsof -ti :4300 2>/dev/null || true)
if [ -n "$EXISTING" ]; then
  kill -9 $EXISTING 2>/dev/null || true
  sleep 1
fi

echo "🔧 Admin 서버 시작 중..."
cd "$ROOT"
nohup pnpm nx serve admin --port=4300 --host=0.0.0.0 > "$LOG" 2>&1 &
echo $! > "$PID_FILE"

echo "  백그라운드 실행됨 (PID: $(cat $PID_FILE))"
echo "  로그: tail -f $LOG"
echo ""

echo "  시작 대기 중..."
for i in $(seq 1 40); do
  if grep -q "localhost:4300\|Local:" "$LOG" 2>/dev/null; then
    echo "  ✅ Admin 서버 준비됨 → http://localhost:4300"
    echo "     계정: admin@auticare.com / Admin123!@#"
    exit 0
  fi
  sleep 1
done
echo "  ⚠️  40초 내 시작 확인 안됨. 로그 확인: tail -f $LOG"
