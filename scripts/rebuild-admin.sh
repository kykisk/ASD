#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="$HOME/.local/node_modules/.bin:$HOME/.local/bin:$ROOT/node_modules/.bin:$PATH"
export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"

echo "🔨 Admin 빌드 중... (2~3분 소요)"
cd "$ROOT"

NX_DAEMON=false pnpm nx build admin --skip-nx-cache 2>&1 | tail -5

if [ -d "$ROOT/apps/admin/dist" ]; then
  echo "✅ Admin 빌드 완료 → apps/admin/dist"
else
  echo "❌ 빌드 실패. 로그 확인 필요"
  exit 1
fi
