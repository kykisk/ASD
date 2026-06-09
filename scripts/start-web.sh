#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="$HOME/.local/node_modules/.bin:$HOME/.local/bin:$ROOT/node_modules/.bin:$PATH"
export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"

LOG="$ROOT/logs/web.log"
PID_FILE="$ROOT/logs/web.pid"

mkdir -p "$ROOT/logs"

if ! command -v pnpm &>/dev/null; then
  echo "❌ pnpm을 찾을 수 없습니다."
  exit 1
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

echo "🌐 Web 서버 시작 중..."
cd "$ROOT"
nohup env NX_PLUGIN_NO_TIMEOUTS=true NX_DAEMON=false NODE_OPTIONS="--max-old-space-size=2048" pnpm nx serve web --port=4200 --host=0.0.0.0 > "$LOG" 2>&1 &
echo $! > "$PID_FILE"

echo "  백그라운드 실행됨 (PID: $(cat $PID_FILE))"
echo "  로그: tail -f $LOG"
echo ""

echo "  시작 대기 중..."
for i in $(seq 1 40); do
  if grep -q "ready in" "$LOG" 2>/dev/null; then
    echo "  ✅ Web 서버 준비됨"
    echo "     앱:     http://localhost:4200"
    echo "     디자인: http://localhost:4200/design-preview"
    exit 0
  fi
  sleep 1
done
echo "  ⚠️  40초 내 시작 확인 안됨. 로그 확인: tail -f $LOG"
