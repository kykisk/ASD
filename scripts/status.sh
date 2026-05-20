#!/bin/bash

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="$HOME/.local/node_modules/.bin:$HOME/.local/bin:$ROOT/node_modules/.bin:$PATH"
export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"

echo "📊 AutiCare 서비스 상태"
echo "══════════════════════════════════"

echo ""
echo "🐳 컨테이너"
PG_STATUS=$(podman inspect --format "{{.State.Status}}" auticare-postgres 2>/dev/null || echo "없음")
RD_STATUS=$(podman inspect --format "{{.State.Status}}" auticare-redis    2>/dev/null || echo "없음")
echo "  PostgreSQL (5433): $PG_STATUS"
echo "  Redis      (6380): $RD_STATUS"

echo ""
echo "🌐 포트 사용 현황"
for PORT in 3100 4200 4300; do
  PIDS=$(lsof -ti :$PORT 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    NAME=$(lsof -i :$PORT 2>/dev/null | grep LISTEN | awk '{print $1}' | head -1)
    echo "  :$PORT → ✅ 실행 중 ($NAME, PID: $PIDS)"
  else
    echo "  :$PORT → ❌ 중지됨"
  fi
done

echo ""
echo "🔗 HTTP 응답"
for URL in "http://localhost:3100/v1" "http://localhost:4200" "http://localhost:4300"; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 "$URL" 2>/dev/null || echo "ERR")
  echo "  $URL → $CODE"
done

echo ""
echo "🔧 환경"
echo "  node:  $(node --version 2>/dev/null || echo 'not found')"
echo "  pnpm:  $(pnpm --version 2>/dev/null || echo 'not found')"
echo "  .env:  $([ -f "$ROOT/.env" ] && echo '✅ 있음' || echo '❌ 없음')"

echo ""
echo "══════════════════════════════════"
