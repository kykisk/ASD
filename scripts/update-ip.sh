#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

NEW_IP=$(curl -s --max-time 3 http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null)

if [ -z "$NEW_IP" ]; then
  echo "❌ IP를 가져올 수 없습니다. 직접 입력하세요:"
  read -r NEW_IP
fi

echo "🔄 IP 업데이트: $NEW_IP"

sed -i "s/[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}:/$NEW_IP:/g" \
  "$ROOT/.env" \
  "$ROOT/scripts/start-mobile.sh" \
  "$ROOT/scripts/restart-mobile.sh"

echo "✅ 완료"
echo ""
echo "📋 서비스 재시작 중..."
"$ROOT/scripts/restart-api.sh"
"$ROOT/scripts/restart-mobile.sh"

echo ""
echo "🌐 접속 주소:"
echo "   웹:    http://$NEW_IP:4200"
echo "   Admin: http://$NEW_IP:4300"
echo "   모바일: http://$NEW_IP:8081"
echo "   API:   http://$NEW_IP:3100/v1"
