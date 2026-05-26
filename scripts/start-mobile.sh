#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="$HOME/.local/node_modules/.bin:$HOME/.local/bin:$ROOT/node_modules/.bin:$PATH"
export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"

LOG="$ROOT/logs/mobile.log"
PID_FILE="$ROOT/logs/mobile.pid"
PORT=8081

mkdir -p "$ROOT/logs"

if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE")
  kill "$OLD_PID" 2>/dev/null || true
  rm -f "$PID_FILE"
fi

PIDS=$(lsof -ti :$PORT 2>/dev/null || true)
[ -n "$PIDS" ] && kill -9 $PIDS 2>/dev/null || true

sleep 1

EXPO_PUBLIC_API_URL="${EXPO_PUBLIC_API_URL:-http://3.35.36.62:3100/v1}"

echo "📱 Expo Web 서버 시작 중..."
echo "  API: $EXPO_PUBLIC_API_URL"
echo "  포트: $PORT"

cd "$ROOT/apps/mobile"
EXPO_PUBLIC_API_URL="$EXPO_PUBLIC_API_URL" \
  nohup npx expo start --web --port $PORT --non-interactive > "$LOG" 2>&1 &
echo $! > "$PID_FILE"

echo "  백그라운드 실행됨 (PID: $(cat $PID_FILE))"
echo "  로그: tail -f $LOG"
echo ""

echo "  시작 대기 중..."
for i in $(seq 1 60); do
  if grep -qE "Web is waiting on|localhost:$PORT" "$LOG" 2>/dev/null; then
    echo "  ✅ Expo Web 준비됨"
    echo "     앱: http://localhost:$PORT"
    echo "     외부: http://3.35.36.62:$PORT"
    exit 0
  fi
  sleep 1
done
echo "  ⚠️  60초 내 시작 확인 안됨. 로그 확인: tail -f $LOG"
