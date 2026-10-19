#!/bin/bash
# AutiCare DB 백업 (pg_dump → backups/auticare-db-YYYYMMDD-HHMM.sql.gz)
# - KEEP_DAYS(기본 14일)보다 오래된 백업은 삭제
# - BACKUP_S3_URI 가 설정되어 있고 aws CLI 가 있으면 S3 에도 업로드
#   예: BACKUP_S3_URI=s3://my-bucket/auticare/db  (.env 또는 환경변수)
# crontab 예: 0 3 * * * /home/ec2-user/workspace/ASD/scripts/backup-db.sh >> /home/ec2-user/workspace/ASD/logs/backup.log 2>&1
set -euo pipefail
umask 077

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="$ROOT/backups"
KEEP_DAYS="${KEEP_DAYS:-14}"
CONTAINER=auticare-postgres

if [ -z "${BACKUP_S3_URI:-}" ] && [ -f "$ROOT/.env" ]; then
  BACKUP_S3_URI=$(grep -E '^BACKUP_S3_URI=' "$ROOT/.env" | cut -d= -f2- || true)
fi

mkdir -p "$BACKUP_DIR"
FILE="$BACKUP_DIR/auticare-db-$(date +%Y%m%d-%H%M).sql.gz"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🗄️  백업 시작 → $FILE"
podman exec "$CONTAINER" pg_dump -U auticare --clean --if-exists auticare | gzip > "$FILE.tmp"
mv "$FILE.tmp" "$FILE"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ 백업 완료 ($(du -h "$FILE" | cut -f1))"

find "$BACKUP_DIR" -name 'auticare-db-*.sql.gz' -mtime +"$KEEP_DAYS" -delete

if [ -n "${BACKUP_S3_URI:-}" ]; then
  if command -v aws &>/dev/null; then
    aws s3 cp "$FILE" "${BACKUP_S3_URI%/}/$(basename "$FILE")" --only-show-errors
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ☁️  S3 업로드 완료 → $BACKUP_S3_URI"
  else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  BACKUP_S3_URI 설정됨, aws CLI 없음 → S3 업로드 생략"
  fi
fi
