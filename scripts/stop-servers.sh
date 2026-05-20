#!/bin/bash
set -e

cd "$(dirname "$0")/.."

echo "🛑 AutiCare 서버 종료 중..."

pkill -f "nx.*serve.*api" 2>/dev/null   && echo "  ✅ API 서버 종료" || echo "  ℹ️  API 서버 없음"
pkill -f "nx.*serve.*web" 2>/dev/null   && echo "  ✅ Web 서버 종료" || echo "  ℹ️  Web 서버 없음"
pkill -f "nx.*serve.*admin" 2>/dev/null && echo "  ✅ Admin 서버 종료" || echo "  ℹ️  Admin 서버 없음"
pkill -f "nest.*start" 2>/dev/null      && echo "  ✅ NestJS 프로세스 종료" || true
pkill -f "vite.*4200\|vite.*4300" 2>/dev/null && echo "  ✅ Vite 프로세스 종료" || true

echo ""
echo "✨ 완료"
