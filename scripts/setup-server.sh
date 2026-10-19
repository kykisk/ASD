#!/bin/bash
# AutiCare 개발 서버 재구축 (RHEL/Amazon Linux/Fedora 계열, dnf + Podman)
#
# 사용법 (새 서버에서):
#   git clone git@github.com:kykisk/ASD.git ~/workspace/ASD
#   (선택) 보관해 둔 .env 를 ~/workspace/ASD/.env 로 복사  ← ENCRYPTION_MASTER_KEY 유지 필수
#   (선택) DB 백업을 ~/workspace/ASD/backups/ 에 복사
#   ~/workspace/ASD/scripts/setup-server.sh
#
# 여러 번 실행해도 안전 (이미 된 단계는 건너뜀). .env 가 있으면 절대 덮어쓰지 않음.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCHEMA=libs/prisma-client/prisma/schema.prisma
cd "$ROOT"

step() { echo ""; echo "━━ $1"; }

step "1. 시스템 패키지 (git, psql, podman, lsof, psmisc, cronie)"
sudo dnf install -y -q git postgresql podman lsof psmisc openssl cronie curl >/dev/null
sudo systemctl enable --now crond >/dev/null 2>&1 || true

step "2. Node 20 (nvm) + pnpm"
export NVM_DIR="$HOME/.nvm"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash >/dev/null
fi
set +u; . "$NVM_DIR/nvm.sh"; set -u
nvm install 20 >/dev/null
nvm alias default 20 >/dev/null
command -v pnpm >/dev/null || npm i -g pnpm@9 >/dev/null
# scripts/*.sh 는 nvm 을 로드하지 않으므로 ~/.local/bin 에 링크
mkdir -p "$HOME/.local/bin"
NODE_BIN="$(dirname "$(nvm which 20)")"
for b in node npm npx pnpm pnpx; do ln -sf "$NODE_BIN/$b" "$HOME/.local/bin/$b"; done
export PATH="$HOME/.local/bin:$PATH"
echo "  node $(node -v), pnpm $(pnpm -v)"

step "3. DB 컨테이너 (PostgreSQL :5433, Redis :6380)"
"$ROOT/scripts/start-db.sh" >/dev/null
podman update --restart=always auticare-postgres >/dev/null
podman update --restart=always auticare-redis >/dev/null
for i in $(seq 1 30); do
  PGPASSWORD=auticare psql -h localhost -p 5433 -U auticare -d auticare -c "SELECT 1" >/dev/null 2>&1 && break
  sleep 2
done
echo "  ✅ DB 준비됨"

step "4. .env"
PUBLIC_IP=$("$ROOT/scripts/public-ip.sh" || echo localhost)
if [ -f "$ROOT/.env" ]; then
  echo "  기존 .env 유지 (IP 만 갱신)"
  sed -i "s/[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}:/$PUBLIC_IP:/g" "$ROOT/.env"
else
  echo "  ⚠️  .env 없음 → 새 비밀값으로 생성 (기존 DB 백업의 암호화 데이터는 복호화 불가)"
  sed -E '/^[A-Z_]+=/ s/[[:space:]]+#.*$//' .env.example > .env
  setv() { sed -i "s|^$1=.*|$1=$2|" .env; }
  setv DATABASE_URL 'postgresql://auticare:auticare@localhost:5433/auticare?schema=public'
  setv REDIS_PORT 6380
  setv JWT_ACCESS_SECRET "$(openssl rand -hex 32)"
  setv JWT_REFRESH_SECRET "$(openssl rand -hex 32)"
  setv ENCRYPTION_MASTER_KEY "$(openssl rand -base64 32)"
  setv AI_DEFAULT_PROVIDER anthropic
  setv CORS_ORIGINS "http://localhost:4200,http://localhost:4300,http://localhost:8081,http://$PUBLIC_IP:4200,http://$PUBLIC_IP:4300,http://$PUBLIC_IP:8081"
  setv WEB_URL "http://$PUBLIC_IP:4200"
  chmod 600 .env
  echo "  👉 ANTHROPIC_API_KEY 등은 직접 입력하세요. .env 는 비밀번호 관리자에 백업하세요."
fi

step "5. 의존성 + Prisma"
pnpm install --frozen-lockfile
pnpm prisma generate --schema=$SCHEMA
pnpm prisma migrate deploy --schema=$SCHEMA

USER_COUNT=$(PGPASSWORD=auticare psql -h localhost -p 5433 -U auticare -d auticare -tAc 'SELECT count(*) FROM "User"')
LATEST_BACKUP=$(ls -t "$ROOT"/backups/auticare-db-*.sql* 2>/dev/null | head -1 || true)
if [ "$USER_COUNT" = "0" ] && [ -n "$LATEST_BACKUP" ]; then
  echo "  빈 DB + 백업 발견 → 복원: $(basename "$LATEST_BACKUP")"
  case "$LATEST_BACKUP" in
    *.gz) gunzip -c "$LATEST_BACKUP" ;;
    *)    cat "$LATEST_BACKUP" ;;
  esac | podman exec -i auticare-postgres psql -q -U auticare -d auticare >/dev/null
fi
pnpm prisma db seed

step "6. 재부팅 자동 기동 (systemd --user) + 매일 DB 백업 (cron)"
sudo loginctl enable-linger "$USER"
mkdir -p "$HOME/.config/systemd/user" "$ROOT/logs"
cat > "$HOME/.config/systemd/user/auticare.service" <<EOF
[Unit]
Description=AutiCare dev servers (DB, API, Web, Admin, Mobile)
After=podman-restart.service network-online.target
Wants=podman-restart.service

[Service]
Type=oneshot
RemainAfterExit=yes
KillMode=process
TimeoutStartSec=900
ExecStart=$ROOT/scripts/boot.sh
StandardOutput=append:$ROOT/logs/boot.log
StandardError=append:$ROOT/logs/boot.log

[Install]
WantedBy=default.target
EOF
systemctl --user daemon-reload
systemctl --user enable podman-restart.service auticare.service

CRON_LINE="0 3 * * * $ROOT/scripts/backup-db.sh >> $ROOT/logs/backup.log 2>&1"
( crontab -l 2>/dev/null | grep -v 'scripts/backup-db.sh' || true; echo "$CRON_LINE" ) | crontab -

grep -q AUTICARE_NO_CLOUD_SETUP "$HOME/.bashrc" || echo 'export AUTICARE_NO_CLOUD_SETUP=1' >> "$HOME/.bashrc"

step "7. 서비스 시작"
systemctl --user restart auticare.service
"$ROOT/scripts/status.sh"

echo ""
echo "✨ 완료. 보안 그룹에서 TCP 3100, 4200, 4300, 8081 을 열어 주세요."
echo "   웹: http://$PUBLIC_IP:4200  Admin: http://$PUBLIC_IP:4300  모바일: http://$PUBLIC_IP:8081"
