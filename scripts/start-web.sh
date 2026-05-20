#!/bin/bash
# 사용법: ./scripts/start-web.sh
# 이 터미널은 Web 서버가 점유합니다. Ctrl+C로 종료.

set -e
export PATH="$HOME/.local/node_modules/.bin:$PATH"

cd "$(dirname "$0")/.."

echo "🌐 AutiCare Web 서버 시작..."
echo "   URL: http://localhost:4200"
echo "   디자인 시안: http://localhost:4200/design-preview"
echo "   종료: Ctrl+C"
echo ""

pnpm nx serve web --port=4200 --host=0.0.0.0
