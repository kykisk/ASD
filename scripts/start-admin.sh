#!/bin/bash
# 사용법: ./scripts/start-admin.sh
# 이 터미널은 Admin 서버가 점유합니다. Ctrl+C로 종료.

set -e
export PATH="$HOME/.local/node_modules/.bin:$PATH"

cd "$(dirname "$0")/.."

echo "🔧 AutiCare Admin 서버 시작..."
echo "   URL: http://localhost:4300"
echo "   종료: Ctrl+C"
echo ""

pnpm nx serve admin --port=4300 --host=0.0.0.0
