#!/bin/bash

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "🛑 AutiCare 서버 종료 중..."

pkill -f "nx.*serve.*api"   2>/dev/null && echo "  ✅ API 서버 종료"   || true
pkill -f "nx.*serve.*web"   2>/dev/null && echo "  ✅ Web 서버 종료"   || true
pkill -f "nx.*serve.*admin" 2>/dev/null && echo "  ✅ Admin 서버 종료" || true
pkill -f "nest.*start"      2>/dev/null || true
pkill -f "vite"             2>/dev/null || true

for PORT in 3000 4200 4300; do
  PIDS=$(lsof -ti :$PORT 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    kill -9 $PIDS 2>/dev/null && echo "  ✅ 포트 $PORT 해제" || true
  fi
done

echo ""
echo "✨ 완료"
