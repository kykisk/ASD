#!/bin/bash
# 사용법: ./scripts/start-api.sh
# 이 터미널은 API 서버가 점유합니다. Ctrl+C로 종료.

set -e
export PATH="$HOME/.local/node_modules/.bin:$PATH"

cd "$(dirname "$0")/.."

EXISTING=$(lsof -ti :3000 2>/dev/null || true)
if [ -n "$EXISTING" ]; then
  echo "  ⚠️  포트 3000 사용 중인 프로세스 종료 중 (PID: $EXISTING)..."
  kill -9 $EXISTING 2>/dev/null || true
  sleep 1
fi

echo "🚀 AutiCare API 서버 시작..."
echo "   URL: http://localhost:3000/v1"
echo "   종료: Ctrl+C"
echo ""

pnpm nx serve api
