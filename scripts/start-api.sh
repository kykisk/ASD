#!/bin/bash
# 사용법: ./scripts/start-api.sh
# 이 터미널은 API 서버가 점유합니다. Ctrl+C로 종료.

set -e
export PATH="$HOME/.local/node_modules/.bin:$PATH"

cd "$(dirname "$0")/.."

echo "🚀 AutiCare API 서버 시작..."
echo "   URL: http://localhost:3000/v1"
echo "   종료: Ctrl+C"
echo ""

pnpm nx serve api
