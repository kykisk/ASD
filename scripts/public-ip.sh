#!/bin/bash
# 이 서버의 공인 IP 출력 (EC2 IMDSv2 → IMDSv1 → 외부 조회 순)
# 실패 시 아무것도 출력하지 않고 exit 1

IMDS=http://169.254.169.254/latest
TOKEN=$(curl -sf --max-time 2 -X PUT -H "X-aws-ec2-metadata-token-ttl-seconds: 60" "$IMDS/api/token" 2>/dev/null || true)
IP=$(curl -sf --max-time 2 ${TOKEN:+-H "X-aws-ec2-metadata-token: $TOKEN"} "$IMDS/meta-data/public-ipv4" 2>/dev/null || true)

if ! [[ "$IP" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  IP=$(curl -sf --max-time 3 https://checkip.amazonaws.com 2>/dev/null | tr -d '[:space:]' || true)
fi

if [[ "$IP" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "$IP"
else
  exit 1
fi
