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

# PID 파일로 기존 프로세스 종료
if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE")
  kill "$OLD_PID" 2>/dev/null || true
  rm -f "$PID_FILE"
fi

# expo, metro 관련 프로세스 전체 종료
pkill -f "expo start" 2>/dev/null || true
pkill -f "metro" 2>/dev/null || true

# 포트 점유 프로세스 강제 종료
PIDS=$(lsof -ti :$PORT 2>/dev/null || true)
[ -n "$PIDS" ] && kill -9 $PIDS 2>/dev/null || true

# 포트가 완전히 해제될 때까지 대기 (최대 10초)
echo "  포트 $PORT 해제 대기 중..."
for i in $(seq 1 10); do
  if ! lsof -ti :$PORT > /dev/null 2>&1; then
    break
  fi
  sleep 1
done

if lsof -ti :$PORT > /dev/null 2>&1; then
  echo "  ❌ 포트 $PORT 해제 실패. 수동으로 확인 필요:"
  echo "     lsof -ti :$PORT | xargs kill -9"
  exit 1
fi

EXPO_PUBLIC_API_URL="${EXPO_PUBLIC_API_URL:-http://3.35.36.62:3100/v1}"

echo "📱 Expo Web 서버 시작 중..."
echo "  API: $EXPO_PUBLIC_API_URL"
echo "  포트: $PORT"

cd "$ROOT/apps/mobile"
CI=1 EXPO_PUBLIC_API_URL="$EXPO_PUBLIC_API_URL" \
  nohup npx expo start --web --port $PORT > "$LOG" 2>&1 &
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
  if grep -qiE "error|failed|cannot" "$LOG" 2>/dev/null; then
    echo "  ❌ 시작 중 오류 발생. 로그 확인:"
    tail -5 "$LOG"
    exit 1
  fi
  sleep 1
done
echo "  ⚠️  60초 내 시작 확인 안됨. 로그 확인: tail -f $LOG"
