#!/bin/bash
# AutiCare 서비스 자동 복구 watchdog
# crontab에 등록: */5 * * * * /home/ec2-user/workspace/ASD/auticare/scripts/watchdog.sh >> /home/ec2-user/workspace/ASD/auticare/logs/watchdog.log 2>&1

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="$HOME/.local/node_modules/.bin:$HOME/.local/bin:$HOME/.local/share/pnpm:$ROOT/node_modules/.bin:$PATH"

check_and_restart() {
  local name=$1
  local port=$2
  local start_script="$ROOT/scripts/start-${name}.sh"

  if curl -sf --max-time 3 "http://localhost:${port}" -o /dev/null 2>/dev/null; then
    return 0
  fi

  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  ${name}(:${port}) 응답 없음 → 재시작"
  bash "$start_script" >> "$ROOT/logs/${name}.log" 2>&1 &
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ ${name} 재시작 완료"
}

check_and_restart "web" "4200"
check_and_restart "admin" "4300"
