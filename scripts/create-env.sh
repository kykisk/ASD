#!/bin/bash
# .env 생성 (.env.example 기반, 새 비밀값 생성). 이미 있으면 아무것도 하지 않음.
# 사용법: create-env.sh [공인IP]
#   공인IP 를 주면 CORS_ORIGINS 에 IP 주소도 추가
#   ENCRYPTION_MASTER_KEY 환경변수가 있으면 그 값을 사용 (클라우드: devdata 의 개발용 키)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env"
PUBLIC_IP="${1:-}"

[ -f "$ENV_FILE" ] && exit 0

umask 077
sed -E '/^[A-Z_]+=/ s/[[:space:]]+#.*$//' "$ROOT/.env.example" > "$ENV_FILE"
setv() { sed -i "s|^$1=.*|$1=$2|" "$ENV_FILE"; }

CORS="http://localhost:4200,http://localhost:4300,http://localhost:8081"
[ -n "$PUBLIC_IP" ] && CORS="$CORS,http://$PUBLIC_IP:4200,http://$PUBLIC_IP:4300,http://$PUBLIC_IP:8081"

setv DATABASE_URL 'postgresql://auticare:auticare@localhost:5433/auticare?schema=public'
setv REDIS_PORT 6380
setv JWT_ACCESS_SECRET "$(openssl rand -hex 32)"
setv JWT_REFRESH_SECRET "$(openssl rand -hex 32)"
setv ENCRYPTION_MASTER_KEY "${ENCRYPTION_MASTER_KEY:-$(openssl rand -base64 32)}"
setv AI_DEFAULT_PROVIDER anthropic
setv CORS_ORIGINS "$CORS"
setv WEB_URL "http://localhost:4200"
printf '\n# Mobile web API URL (기본 /v1: serve-mobile.js 가 API 로 프록시)\nEXPO_PUBLIC_API_URL=/v1\n' >> "$ENV_FILE"

echo "  ✅ .env 생성됨 (ANTHROPIC_API_KEY 등은 직접 입력)"
