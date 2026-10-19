#!/bin/bash
# 개발 서버 DB → 정리된 스냅샷 → 비공개 리포 kykisk/ASD-devdata 로 push
# 클라우드 세션은 scripts/cloud-setup.sh 에서 이 스냅샷을 복원해 사용.
#
# 정리 내용: scripts/devdata-sanitize.ts 참고 (아이 이름 마스킹 + 개발용 키 재암호화,
#           API 키·토큰·IP 제거, 사용자 비밀번호 Dev123!@#)
#
# 사용법: ./scripts/export-devdata.sh            (스냅샷 생성 + commit + push)
#         ./scripts/export-devdata.sh --no-push  (생성만)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="$HOME/.local/bin:$ROOT/node_modules/.bin:$PATH"
DEVDATA_DIR="${AUTICARE_DEVDATA_DIR:-$HOME/workspace/ASD-devdata}"
DEVDATA_REMOTE="${AUTICARE_DEVDATA_REMOTE:-git@github.com:kykisk/ASD-devdata.git}"
CONTAINER=auticare-postgres
SOURCE_DB="${AUTICARE_SOURCE_DB:-auticare}"
TMP_DB=auticare_devdata
PUSH=1
[ "${1:-}" = "--no-push" ] && PUSH=0

cd "$ROOT"
umask 077

if [ ! -d "$DEVDATA_DIR/.git" ]; then
  echo "📥 devdata 리포 clone: $DEVDATA_REMOTE"
  git clone -q "$DEVDATA_REMOTE" "$DEVDATA_DIR"
fi
git -C "$DEVDATA_DIR" pull -q --ff-only 2>/dev/null || true

if [ ! -f "$DEVDATA_DIR/dev-encryption-key" ]; then
  openssl rand -base64 32 > "$DEVDATA_DIR/dev-encryption-key"
  echo "🔑 개발용 암호화 키 생성 (dev-encryption-key)"
fi

REAL_KEY=$(grep -E '^ENCRYPTION_MASTER_KEY=' "$ROOT/.env" | cut -d= -f2-)
DEV_KEY=$(tr -d '[:space:]' < "$DEVDATA_DIR/dev-encryption-key")

dropdb() { podman exec "$CONTAINER" dropdb -U auticare --if-exists "$TMP_DB"; }
trap dropdb EXIT

echo "🗄️  임시 DB 로 복사"
dropdb
podman exec "$CONTAINER" createdb -U auticare "$TMP_DB"
podman exec "$CONTAINER" pg_dump -U auticare "$SOURCE_DB" |
  podman exec -i "$CONTAINER" psql -q -U auticare -d "$TMP_DB" -v ON_ERROR_STOP=1 >/dev/null

echo "🧹 정리 (마스킹 + 재암호화)"
DATABASE_URL="postgresql://auticare:auticare@localhost:5433/$TMP_DB?schema=public" \
  REAL_ENCRYPTION_KEY="$REAL_KEY" DEV_ENCRYPTION_KEY="$DEV_KEY" \
  pnpm exec tsx scripts/devdata-sanitize.ts

echo "📦 스냅샷 저장"
podman exec "$CONTAINER" pg_dump -U auticare --clean --if-exists --no-owner --no-privileges "$TMP_DB" |
  gzip -n > "$DEVDATA_DIR/snapshot.sql.gz"
MIGRATION=$(podman exec "$CONTAINER" psql -U auticare -d "$TMP_DB" -tAc \
  'SELECT migration_name FROM _prisma_migrations ORDER BY finished_at DESC NULLS LAST LIMIT 1')
SOURCE_COMMIT=$(git -C "$ROOT" rev-parse --short HEAD)
printf '%s (ASD %s, migration %s)\n' "$(date '+%Y-%m-%d %H:%M')" "$SOURCE_COMMIT" "$MIGRATION" > "$DEVDATA_DIR/SNAPSHOT_INFO"
cat "$DEVDATA_DIR/SNAPSHOT_INFO"

if [ "$PUSH" = 1 ]; then
  cd "$DEVDATA_DIR"
  git add -A
  if git diff --cached --quiet; then
    echo "변경 없음"
  else
    git commit -q -m "snapshot: $(head -1 SNAPSHOT_INFO)"
    git push -q origin HEAD
    echo "✅ push 완료 → $DEVDATA_REMOTE"
  fi
fi
