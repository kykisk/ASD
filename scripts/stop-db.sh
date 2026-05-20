#!/bin/bash
set -e

cd "$(dirname "$0")/.."

echo "🛑 DB 컨테이너 종료 중..."

podman stop auticare-postgres 2>/dev/null && echo "  ✅ PostgreSQL 종료" || echo "  ℹ️  auticare-postgres 없음"
podman stop auticare-redis    2>/dev/null && echo "  ✅ Redis 종료"      || echo "  ℹ️  auticare-redis 없음"

echo ""
echo "✨ 완료"
