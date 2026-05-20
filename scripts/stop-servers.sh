#!/bin/bash
set -e

cd "$(dirname "$0")/.."

echo "🛑 AutiCare 서버 종료 중..."

pkill -f "nx.*serve.*api"   2>/dev/null && echo "  ✅ API 서버 종료" || true
pkill -f "nx.*serve.*web"   2>/dev/null && echo "  ✅ Web 서버 종료" || true
pkill -f "nx.*serve.*admin" 2>/dev/null && echo "  ✅ Admin 서버 종료" || true
pkill -f "nest.*start"      2>/dev/null || true
pkill -f "vite.*4200\|vite.*4300" 2>/dev/null || true

PIDS_3000=$(lsof -ti :3000 2>/dev/null || true)
PIDS_4200=$(lsof -ti :4200 2>/dev/null || true)
PIDS_4300=$(lsof -ti :4300 2>/dev/null || true)

[ -n "$PIDS_3000" ] && kill -9 $PIDS_3000 2>/dev/null && echo "  ✅ 포트 3000 해제" || true
[ -n "$PIDS_4200" ] && kill -9 $PIDS_4200 2>/dev/null && echo "  ✅ 포트 4200 해제" || true
[ -n "$PIDS_4300" ] && kill -9 $PIDS_4300 2>/dev/null && echo "  ✅ 포트 4300 해제" || true

echo ""
echo "✨ 완료"

