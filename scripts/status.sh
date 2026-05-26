#!/bin/bash

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="$HOME/.local/node_modules/.bin:$HOME/.local/bin:$ROOT/node_modules/.bin:$PATH"
export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"

echo "📊 AutiCare 서비스 상태"
echo "══════════════════════════════════════"

echo ""
echo "🐳 DB 컨테이너"
PG_STATUS=$(podman inspect --format "{{.State.Status}}" auticare-postgres 2>/dev/null || echo "없음")
RD_STATUS=$(podman inspect --format "{{.State.Status}}" auticare-redis    2>/dev/null || echo "없음")
echo "  PostgreSQL (:5433) : $PG_STATUS"
echo "  Redis      (:6380) : $RD_STATUS"

echo ""
echo "🚀 서버 프로세스"
for SVC in api web admin mobile; do
  PID_FILE="$ROOT/logs/$SVC.pid"
  PORT=$( [ "$SVC" = "api" ] && echo 3100 || ( [ "$SVC" = "web" ] && echo 4200 || ( [ "$SVC" = "admin" ] && echo 4300 || echo 8081 ) ) )
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
      echo "  ✅ $SVC  (:$PORT)  실행 중 (PID: $PID)"
    else
      echo "  ❌ $SVC  (:$PORT)  PID 파일 있으나 프로세스 없음"
      rm -f "$PID_FILE"
    fi
  else
    echo "  ❌ $SVC  (:$PORT)  중지됨"
  fi
done

echo ""
echo "🔗 HTTP 응답"
for ITEM in "3100:/v1" "4200:/" "4300:/"; do
  PORT="${ITEM%%:*}"
  PATH_="${ITEM##*:}"
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 "http://localhost:$PORT$PATH_" 2>/dev/null || echo "ERR")
  echo "  :$PORT$PATH_  →  HTTP $CODE"
done

echo ""
echo "📋 최근 로그 (마지막 3줄)"
for SVC in api web admin; do
  LOG="$ROOT/logs/$SVC.log"
  if [ -f "$LOG" ]; then
    echo "  [$SVC]"
    tail -3 "$LOG" 2>/dev/null | sed 's/^/    /'
  fi
done

echo ""
echo "══════════════════════════════════════"
echo "  로그 실시간 보기: tail -f $ROOT/logs/<api|web|admin>.log"
