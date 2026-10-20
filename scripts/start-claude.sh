#!/bin/bash
# 이 프로젝트 폴더에서 Claude Code Remote Control 시작 (systemd --user 서비스: claude-rc-ASD)
# claude.ai / Claude 앱에서 이 서버의 세션으로 표시되며, 거기서 만든 세션은 이 폴더에서 열림.
# SSH 를 끊어도 계속 실행되고, 죽으면 자동 재시작, 서버 재부팅 후에도 자동 시작.
# (stop-claude.sh 로 끄면 재부팅 후에도 뜨지 않음)
#
# 사용법: ./scripts/start-claude.sh [권한모드]
#   권한모드 (기본 auto):
#     auto        — 확인 창 없이 진행, 별도 안전 검사 모델이 위험한 작업만 차단 (기본)
#     acceptEdits — 파일 수정만 자동 허용, 명령 실행은 확인
#     default     — 매번 확인
#     plan        — 읽기/계획만
#   (CLAUDE_RC_PERMISSION_MODE 환경변수로도 지정 가능)
#   bypassPermissions(모든 검사 해제)는 이 서버(실데이터·sudo·GitHub push 키)에서는 쓰지 말 것
#   권한모드를 바꾸려면 stop-claude.sh 후 다시 start-claude.sh <모드>
# 상태: systemctl --user status claude-rc-ASD
# 종료: ./scripts/stop-claude.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NAME=ASD
UNIT="claude-rc-$NAME"
UNIT_FILE="$HOME/.config/systemd/user/$UNIT.service"
CLAUDE_BIN="${CLAUDE_BIN:-$HOME/.local/bin/claude}"
MODE="${1:-${CLAUDE_RC_PERMISSION_MODE:-auto}}"

if systemctl --user is-active --quiet "$UNIT"; then
  echo "✅ 이미 실행 중: $UNIT  (상태: systemctl --user status $UNIT)"
  exit 0
fi
systemctl --user reset-failed "$UNIT" 2>/dev/null || true

mkdir -p "$(dirname "$UNIT_FILE")"
cat > "$UNIT_FILE" <<EOF
[Unit]
Description=Claude Code Remote Control ($NAME)
After=network-online.target

[Service]
WorkingDirectory=$ROOT
ExecStart=$CLAUDE_BIN remote-control --name $NAME --permission-mode $MODE
Restart=always
RestartSec=10

[Install]
WantedBy=default.target
EOF
systemctl --user daemon-reload
systemctl --user enable --now --quiet "$UNIT"

sleep 5
if systemctl --user is-active --quiet "$UNIT"; then
  echo "🚀 Remote Control 시작: $NAME ($ROOT), 권한모드 $MODE (재부팅 후 자동 시작)"
  echo "   Claude 앱 / claude.ai/code 에서 이 서버의 $NAME 세션 선택"
  echo "   상태: systemctl --user status $UNIT   종료: $ROOT/scripts/stop-claude.sh"
else
  echo "❌ 시작 실패. 직접 실행해 원인 확인: cd $ROOT && $CLAUDE_BIN remote-control --name $NAME"
  echo "   처음 쓰는 폴더면 \"Workspace not trusted\" 일 수 있음 → SSH 로 cd $ROOT && claude 실행 후 신뢰 확인(Yes) 하고 /exit"
  systemctl --user disable --now --quiet "$UNIT" 2>/dev/null || true
  systemctl --user reset-failed "$UNIT" 2>/dev/null || true
  exit 1
fi
