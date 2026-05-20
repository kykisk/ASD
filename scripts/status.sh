#!/bin/bash

cd "$(dirname "$0")/.."

echo "📊 AutiCare 서비스 상태"
echo "══════════════════════════════════"
echo ""

echo "🐳 컨테이너"
PG_STATUS=$(podman inspect --format "{{.State.Status}}" auticare-postgres 2>/dev/null || echo "없음")
RD_STATUS=$(podman inspect --format "{{.State.Status}}" auticare-redis    2>/dev/null || echo "없음")
echo "  PostgreSQL (5433): $PG_STATUS"
echo "  Redis      (6380): $RD_STATUS"

echo ""
echo "🌐 서버 프로세스"
pgrep -fa "nx.*serve.*api"   > /dev/null 2>&1 && echo "  API   (:3000): ✅ 실행 중" || echo "  API   (:3000): ❌ 중지됨"
pgrep -fa "vite.*4200\|nx.*serve.*web" > /dev/null 2>&1 && echo "  Web   (:4200): ✅ 실행 중" || echo "  Web   (:4200): ❌ 중지됨"
pgrep -fa "vite.*4300\|nx.*serve.*admin" > /dev/null 2>&1 && echo "  Admin (:4300): ✅ 실행 중" || echo "  Admin (:4300): ❌ 중지됨"

echo ""
echo "🔗 HTTP 응답 확인"
curl -s -o /dev/null -w "  API   http://localhost:3000/v1      → HTTP %{http_code}\n" http://localhost:3000/v1       2>/dev/null || echo "  API   http://localhost:3000      → 응답 없음"
curl -s -o /dev/null -w "  Web   http://localhost:4200         → HTTP %{http_code}\n" http://localhost:4200          2>/dev/null || echo "  Web   http://localhost:4200      → 응답 없음"
curl -s -o /dev/null -w "  Admin http://localhost:4300         → HTTP %{http_code}\n" http://localhost:4300          2>/dev/null || echo "  Admin http://localhost:4300      → 응답 없음"

echo ""
echo "══════════════════════════════════"
