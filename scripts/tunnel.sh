#!/bin/bash
# AutiCare 테스트 터널 관리 스크립트
# 사용법: ./scripts/tunnel.sh [start|stop|status]

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG="$ROOT/logs/tunnel.log"
PID_FILE="$ROOT/logs/tunnel.pid"
URL_FILE="$ROOT/logs/tunnel.url"

mkdir -p "$ROOT/logs"

case "${1:-start}" in

  start)
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "⚠️  터널이 이미 실행 중입니다."
      echo "   URL: $(cat "$URL_FILE" 2>/dev/null || echo '확인 중...')"
      exit 0
    fi

    echo "🔄 Cloudflare 터널 시작 중..."
    echo "   Web(4200) → 공개 HTTPS URL"
    echo "   API는 Vite proxy를 통해 자동 연결됩니다"
    echo ""

    # 기존 로그 제거
    rm -f "$LOG" "$URL_FILE"

    nohup cloudflared tunnel --url http://localhost:4200 \
      --no-autoupdate > "$LOG" 2>&1 &
    echo $! > "$PID_FILE"

    # URL 추출 대기
    echo "  URL 발급 대기 중..."
    for i in $(seq 1 30); do
      URL=$(grep -o 'https://[a-z0-9\-]*\.trycloudflare\.com' "$LOG" 2>/dev/null | head -1)
      if [ -n "$URL" ]; then
        echo "$URL" > "$URL_FILE"
        echo ""
        echo "✅ 터널 시작됨!"
        echo ""
        echo "  ┌────────────────────────────────────────────────────┐"
        echo "  │ 테스터 공유 URL                                     │"
        echo "  │                                                      │"
        echo "  │  🌐 웹앱: $URL"
        echo "  │  📱 모바일: $URL (동일 URL, 브라우저에서 접속)      │"
        echo "  │                                                      │"
        echo "  │  ⚠️  Admin 패널은 공개되지 않음 (보안)              │"
        echo "  └────────────────────────────────────────────────────┘"
        echo ""
        echo "  터널 종료: ./scripts/tunnel.sh stop"
        exit 0
      fi
      sleep 1
    done

    echo "❌ URL 발급 시간 초과. 로그 확인: tail -f $LOG"
    ;;

  stop)
    if [ -f "$PID_FILE" ]; then
      PID=$(cat "$PID_FILE")
      kill "$PID" 2>/dev/null && echo "✅ 터널 종료됨 (PID: $PID)" || echo "⚠️  프로세스를 찾을 수 없습니다"
      rm -f "$PID_FILE" "$URL_FILE"
    else
      pkill -f "cloudflared tunnel" 2>/dev/null && echo "✅ 터널 종료됨" || echo "실행 중인 터널 없음"
    fi
    ;;

  status)
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      URL=$(cat "$URL_FILE" 2>/dev/null || echo "URL 확인 중...")
      echo "✅ 터널 실행 중"
      echo "   PID: $(cat "$PID_FILE")"
      echo "   URL: $URL"
    else
      echo "❌ 터널 실행 중 아님"
    fi
    ;;

  url)
    cat "$URL_FILE" 2>/dev/null || echo "터널이 실행 중이지 않습니다"
    ;;

  *)
    echo "사용법: $0 [start|stop|status|url]"
    ;;
esac
