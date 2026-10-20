#!/bin/bash
# start-claude.sh 로 띄운 Remote Control 종료 (systemd --user 서비스: claude-rc-ASD)
# 이 Remote Control 에서 열린 세션들도 함께 종료됨 (대화 기록은 claude.ai 에 남음).
set -euo pipefail

NAME=ASD
UNIT="claude-rc-$NAME"

if ! systemctl --user is-active --quiet "$UNIT"; then
  echo "ℹ️  실행 중이 아님: $UNIT"
  systemctl --user reset-failed "$UNIT" 2>/dev/null || true
  exit 0
fi

systemctl --user stop "$UNIT"
echo "🛑 Remote Control 종료: $NAME"
