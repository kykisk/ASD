#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="$HOME/.local/node_modules/.bin:$HOME/.local/bin:$ROOT/node_modules/.bin:$PATH"
export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"

LOG="$ROOT/logs/web.log"
PID_FILE="$ROOT/logs/web.pid"
DIST="$ROOT/apps/web/dist"

mkdir -p "$ROOT/logs"

if [ ! -d "$DIST" ]; then
  echo "⚠️  빌드 파일 없음. 빌드 실행 중... (2~3분 소요)"
  bash "$ROOT/scripts/rebuild-web.sh"
fi

if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE")
  kill "$OLD_PID" 2>/dev/null || true
  rm -f "$PID_FILE"
fi

for PORT in 4200 4201 4202; do
  PIDS=$(lsof -ti :$PORT 2>/dev/null || true)
  [ -n "$PIDS" ] && kill -9 $PIDS 2>/dev/null || true
done

sleep 1

echo "🌐 Web 서버 시작 중 (정적 빌드)..."
nohup npx serve "$DIST" -l 4200 --no-clipboard --single > "$LOG" 2>&1 &
echo $! > "$PID_FILE"

echo "  백그라운드 실행됨 (PID: $(cat $PID_FILE))"
echo "  로그: tail -f $LOG"
echo ""

echo "  시작 대기 중..."
for i in $(seq 1 10); do
  if curl -sf http://localhost:4200 -o /dev/null 2>/dev/null; then
    echo "  ✅ Web 서버 준비됨 → http://localhost:4200"
    exit 0
  fi
  sleep 1
done
echo "  ⚠️  10초 내 시작 확인 안됨. 로그 확인: tail -f $LOG"
