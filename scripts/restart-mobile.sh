#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="$HOME/.local/node_modules/.bin:$HOME/.local/bin:$ROOT/node_modules/.bin:$PATH"
export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"

PORT=8081
PID_FILE="$ROOT/logs/mobile.pid"
LOG="$ROOT/logs/mobile.log"
DIST="$ROOT/apps/mobile/dist"

mkdir -p "$ROOT/logs"

echo "🔄 모바일 웹 재빌드 + 재시작"
echo ""

# 기존 서버 종료
if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  kill "$PID" 2>/dev/null && echo "  기존 서버 종료 (PID: $PID)" || true
  rm -f "$PID_FILE"
fi
fuser -k $PORT/tcp 2>/dev/null || true
sleep 1

# dist 삭제 + 재빌드
echo "  📦 빌드 중... (1~2분)"
rm -rf "$DIST"

EXPO_PUBLIC_API_URL="${EXPO_PUBLIC_API_URL:-http://3.38.146.1:3100/v1}"
cd "$ROOT/apps/mobile"
CI=1 EXPO_PUBLIC_API_URL="$EXPO_PUBLIC_API_URL" \
  npx expo export --platform web --output-dir "$DIST" 2>&1 | tail -5

if [ ! -f "$DIST/index.html" ]; then
  echo "  ❌ 빌드 실패"
  exit 1
fi
echo "  ✅ 빌드 완료"
echo ""

# 정적 서버 시작
echo "  🌐 서버 시작 중..."
cd "$ROOT"
nohup node scripts/serve-mobile.js > "$LOG" 2>&1 &
echo $! > "$PID_FILE"
sleep 1

if kill -0 "$(cat $PID_FILE)" 2>/dev/null; then
  echo "  ✅ 준비됨 (PID: $(cat $PID_FILE))"
  echo "     http://localhost:$PORT"
  echo "     http://3.38.146.1:$PORT"
else
  echo "  ❌ 서버 시작 실패. 로그: tail -f $LOG"
  exit 1
fi
