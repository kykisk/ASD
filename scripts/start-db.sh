#!/bin/bash
# AutiCare — DB/Redis 컨테이너 시작
# 사용법: ./scripts/start-db.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🐘 AutiCare DB 시작..."

# auticare-postgres 컨테이너 확인 및 시작
if podman ps -a --format "{{.Names}}" | grep -q "^auticare-postgres$"; then
  STATUS=$(podman inspect --format "{{.State.Status}}" auticare-postgres 2>/dev/null)
  if [ "$STATUS" = "running" ]; then
    echo "  ✅ auticare-postgres 이미 실행 중 (port 5433)"
  else
    echo "  ▶️  auticare-postgres 시작 중..."
    podman start auticare-postgres
    echo "  ✅ auticare-postgres 시작됨 (port 5433)"
  fi
else
  echo "  ▶️  auticare-postgres 새로 생성 중..."
  podman run -d --name auticare-postgres \
    -e POSTGRES_USER=auticare \
    -e POSTGRES_PASSWORD=password \
    -e POSTGRES_DB=auticare \
    -p 5433:5432 \
    docker.io/library/postgres:16-alpine
  echo "  ✅ auticare-postgres 생성됨 (port 5433)"
fi

# auticare-redis 컨테이너 확인 및 시작
if podman ps -a --format "{{.Names}}" | grep -q "^auticare-redis$"; then
  STATUS=$(podman inspect --format "{{.State.Status}}" auticare-redis 2>/dev/null)
  if [ "$STATUS" = "running" ]; then
    echo "  ✅ auticare-redis 이미 실행 중 (port 6380)"
  else
    echo "  ▶️  auticare-redis 시작 중..."
    podman start auticare-redis
    echo "  ✅ auticare-redis 시작됨 (port 6380)"
  fi
else
  echo "  ▶️  auticare-redis 새로 생성 중..."
  podman run -d --name auticare-redis \
    -p 6380:6379 \
    docker.io/library/redis:7-alpine redis-server --appendonly yes
  echo "  ✅ auticare-redis 생성됨 (port 6380)"
fi

echo ""
echo "  잠시 대기 중..."
sleep 3

# 헬스체크
echo ""
echo "🔍 연결 확인..."
if PGPASSWORD=password psql -h localhost -p 5433 -U auticare -d auticare -c "SELECT 1" > /dev/null 2>&1; then
  echo "  ✅ PostgreSQL 연결 OK"
else
  echo "  ⚠️  PostgreSQL 아직 준비 중 (10초 후 다시 시도하세요)"
fi

if redis-cli -h localhost -p 6380 ping > /dev/null 2>&1; then
  echo "  ✅ Redis 연결 OK"
else
  echo "  ⚠️  Redis 아직 준비 중"
fi

echo ""
echo "✨ DB 준비 완료!"
echo ""
echo "  다음 단계:"
echo "    API:  ./scripts/start-api.sh   (새 터미널)"
echo "    Web:  ./scripts/start-web.sh   (새 터미널)"
