#!/bin/bash
# Claude Code 클라우드 세션 전용 개발환경 구성 (.claude/settings.json 의 SessionStart hook)
#
# - PostgreSQL 16 (:5433) + Redis 7 (:6380) 기동 (클라우드 VM 에 기본 설치됨)
# - .env 생성, pnpm install, prisma generate / migrate deploy / seed
# - 빈 DB 이면 비공개 리포 kykisk/ASD-devdata 의 스냅샷 복원 (scripts/export-devdata.sh 로 생성)
#
# 클라우드 세션(CLAUDE_CODE_REMOTE=true)에서만 동작. 개발 서버에서는 아래 표시로 건너뜀:
#   AUTICARE_NO_CLOUD_SETUP=1 또는 ~/.auticare-no-cloud-setup 파일
# 여러 번 실행해도 안전 (세션 재개 시에도 실행됨).
set -euo pipefail

[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0
[ -z "${AUTICARE_NO_CLOUD_SETUP:-}" ] || exit 0
[ ! -f "$HOME/.auticare-no-cloud-setup" ] || exit 0

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCHEMA=libs/prisma-client/prisma/schema.prisma
DEVDATA_REPO="${AUTICARE_DEVDATA_REPO:-https://github.com/kykisk/ASD-devdata.git}"
DEVDATA_DIR="${AUTICARE_DEVDATA_DIR:-$HOME/.cache/auticare-devdata}"
LOG="$ROOT/logs/cloud-setup.log"
cd "$ROOT"
mkdir -p "$ROOT/logs"

# hook stdout 은 Claude 의 컨텍스트로 들어가므로 상세 로그는 파일로
exec 3>&1 >>"$LOG" 2>&1
say() { echo "$*" >&3; echo "$*"; }
as_root() { if [ "$(id -u)" = 0 ]; then "$@"; else sudo -n "$@"; fi; }
as_postgres() { if [ "$(id -u)" = 0 ]; then su postgres -c "$1"; else sudo -n -u postgres sh -c "$1"; fi; }
pg() { PGPASSWORD=auticare psql -h localhost -p 5433 -U auticare -d auticare -v ON_ERROR_STOP=1 "$@"; }

echo "===== $(date '+%Y-%m-%d %H:%M:%S') cloud-setup ====="

# ─── PostgreSQL :5433 ───────────────────────────────────────
PG_CONF=$(ls /etc/postgresql/*/main/postgresql.conf 2>/dev/null | sort -V | tail -1)
if [ -z "$PG_CONF" ]; then
  say "❌ PostgreSQL 설정 파일을 찾을 수 없습니다 (/etc/postgresql/*/main). 로그: $LOG"
  exit 1
fi
if ! grep -qE '^port = 5433' "$PG_CONF"; then
  as_root sed -i -E 's/^#?port = [0-9]+/port = 5433/' "$PG_CONF"
  as_root service postgresql restart
else
  as_root service postgresql start
fi
for i in $(seq 1 30); do
  as_postgres "pg_isready -q -p 5433" && break
  sleep 1
done
as_postgres "psql -p 5433 -tAc \"SELECT 1 FROM pg_roles WHERE rolname='auticare'\"" | grep -q 1 ||
  as_postgres "psql -p 5433 -c \"CREATE ROLE auticare LOGIN PASSWORD 'auticare' CREATEDB\""
as_postgres "psql -p 5433 -tAc \"SELECT 1 FROM pg_database WHERE datname='auticare'\"" | grep -q 1 ||
  as_postgres "createdb -p 5433 -O auticare auticare"

# ─── Redis :6380 ────────────────────────────────────────────
if ! redis-cli -p 6380 ping >/dev/null 2>&1; then
  redis-server --port 6380 --daemonize yes --save '' --appendonly no
fi

# ─── devdata 스냅샷 (비공개 리포, GitHub 프록시가 인증 처리) ──
HAS_DEVDATA=0
if [ -d "$DEVDATA_DIR/.git" ]; then
  git -C "$DEVDATA_DIR" pull -q --ff-only || true
  HAS_DEVDATA=1
elif git clone -q --depth 1 "$DEVDATA_REPO" "$DEVDATA_DIR"; then
  HAS_DEVDATA=1
fi

# ─── .env ───────────────────────────────────────────────────
if [ ! -f "$ROOT/.env" ]; then
  if [ "$HAS_DEVDATA" = 1 ] && [ -f "$DEVDATA_DIR/dev-encryption-key" ]; then
    ENCRYPTION_MASTER_KEY=$(tr -d '[:space:]' < "$DEVDATA_DIR/dev-encryption-key") "$ROOT/scripts/create-env.sh"
  else
    "$ROOT/scripts/create-env.sh"
  fi
fi

# ─── 의존성 + Prisma ────────────────────────────────────────
pnpm install --frozen-lockfile
pnpm prisma generate --schema=$SCHEMA

RESTORED=""
FRESH_DB=$(pg -tAc "SELECT to_regclass('public._prisma_migrations') IS NULL")
if [ "$FRESH_DB" = "t" ] && [ "$HAS_DEVDATA" = 1 ] && [ -f "$DEVDATA_DIR/snapshot.sql.gz" ]; then
  gunzip -c "$DEVDATA_DIR/snapshot.sql.gz" | pg -q >/dev/null
  RESTORED=$(cat "$DEVDATA_DIR/SNAPSHOT_INFO" 2>/dev/null | head -1 || true)
fi
pnpm prisma migrate deploy --schema=$SCHEMA
pnpm prisma db seed

# ─── 결과 (Claude 컨텍스트로 전달) ──────────────────────────
USERS=$(pg -tAc 'SELECT count(*) FROM "User"')
CHILDREN=$(pg -tAc 'SELECT count(*) FROM "Child"')
say "AutiCare 클라우드 개발환경 준비 완료: PostgreSQL localhost:5433, Redis localhost:6380 (auticare/auticare/auticare)"
if [ -n "$RESTORED" ]; then
  say "devdata 스냅샷 복원: $RESTORED (사용자 $USERS명, 아이 $CHILDREN명). 스냅샷 사용자 비밀번호는 Dev123!@#, admin@auticare.com 은 Admin123!@#"
elif [ "$HAS_DEVDATA" = 0 ]; then
  say "devdata 리포($DEVDATA_REPO)에 접근할 수 없어 빈 DB + admin seed 로 시작 (사용자 $USERS명)"
else
  say "기존 DB 유지 (사용자 $USERS명, 아이 $CHILDREN명)"
fi
say "서버 실행은 scripts/start-api.sh, start-web.sh, start-admin.sh 사용. DB 는 이미 떠 있으므로 start-db.sh(Podman 전용)는 실행하지 말 것. 상세 로그: $LOG"
