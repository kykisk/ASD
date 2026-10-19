#!/bin/bash
# 재부팅 후 AutiCare 전체 서비스 기동
# systemd --user auticare.service 에서 호출 (setup-server.sh 가 등록)

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="$HOME/.local/bin:$PATH"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🚀 AutiCare 부팅 기동"

"$ROOT/scripts/start-db.sh"
for i in $(seq 1 30); do
  PGPASSWORD=auticare psql -h localhost -p 5433 -U auticare -d auticare -c "SELECT 1" >/dev/null 2>&1 && break
  sleep 2
done

"$ROOT/scripts/start-api.sh"
"$ROOT/scripts/start-web.sh"
"$ROOT/scripts/start-admin.sh"
"$ROOT/scripts/start-mobile.sh"
