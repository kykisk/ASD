#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="$HOME/.local/node_modules/.bin:$HOME/.local/bin:$ROOT/node_modules/.bin:$PATH"
export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"

LOG="$ROOT/logs/api.log"
PID_FILE="$ROOT/logs/api.pid"

mkdir -p "$ROOT/logs"

if [ ! -f "$ROOT/.env" ]; then
  echo "❌ .env 파일이 없습니다."
  exit 1
fi

if ! command -v pnpm &>/dev/null; then
  echo "❌ pnpm을 찾을 수 없습니다."
  exit 1
fi

if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE")
  kill "$OLD_PID" 2>/dev/null && echo "  이전 API 프로세스 종료 (PID: $OLD_PID)" || true
  rm -f "$PID_FILE"
  sleep 1
fi

EXISTING=$(lsof -ti :3100 2>/dev/null || true)
if [ -n "$EXISTING" ]; then
  kill -9 $EXISTING 2>/dev/null || true
  sleep 1
fi

echo "🔨 API 빌드 중..."
cd "$ROOT"
pnpm nx run api:build --skip-nx-cache > /tmp/auticare-build.log 2>&1
if [ $? -ne 0 ]; then
  echo "❌ 빌드 실패. 로그 확인: cat /tmp/auticare-build.log"
  exit 1
fi
echo "  ✅ 빌드 완료"

echo "🚀 API 서버 시작 중..."
nohup node "$ROOT/apps/api/dist/main.js" > "$LOG" 2>&1 &
echo $! > "$PID_FILE"

echo "  백그라운드 실행됨 (PID: $(cat $PID_FILE))"
echo "  로그: tail -f $LOG"
echo ""

echo "  시작 대기 중..."
for i in $(seq 1 30); do
  if grep -q "successfully started" "$LOG" 2>/dev/null; then
    echo "  ✅ API 서버 준비됨 → http://localhost:3100/v1"
    exit 0
  fi
  if grep -q "EADDRINUSE\|Cannot find module" "$LOG" 2>/dev/null; then
    echo "  ❌ 시작 실패. 로그 확인:"
    tail -5 "$LOG"
    exit 1
  fi
  sleep 1
done
echo "  ⚠️  30초 내 시작 확인 안됨. 로그 확인: tail -f $LOG"
