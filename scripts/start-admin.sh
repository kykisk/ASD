#!/bin/bash
# 이 터미널은 Admin 서버가 점유합니다. Ctrl+C로 종료.

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

export PATH="$HOME/.local/node_modules/.bin:$HOME/.local/bin:$ROOT/node_modules/.bin:$PATH"
export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"

if ! command -v pnpm &>/dev/null; then
  echo "  ❌ pnpm을 찾을 수 없습니다. npm install -g pnpm 으로 설치하세요."
  exit 1
fi

EXISTING=$(lsof -ti :4300 2>/dev/null || true)
if [ -n "$EXISTING" ]; then
  echo "  ⚠️  포트 4300 사용 중인 프로세스 종료 중 (PID: $EXISTING)..."
  kill -9 $EXISTING 2>/dev/null || true
  sleep 1
fi

echo "🔧 AutiCare Admin 서버 시작..."
echo "   URL: http://localhost:4300"
echo "   기본 계정: admin@auticare.com / Admin123!@#"
echo "   종료: Ctrl+C"
echo ""

cd "$ROOT"
pnpm nx serve admin --port=4300 --host=0.0.0.0
