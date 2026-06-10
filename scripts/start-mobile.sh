#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="$HOME/.local/node_modules/.bin:$HOME/.local/bin:$ROOT/node_modules/.bin:$PATH"
export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"

LOG="$ROOT/logs/mobile.log"
PID_FILE="$ROOT/logs/mobile.pid"
PORT=8081
DIST="$ROOT/apps/mobile/dist"

mkdir -p "$ROOT/logs"

if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE")
  kill "$OLD_PID" 2>/dev/null || true
  rm -f "$PID_FILE"
fi

pkill -f "expo start\|expo export\|mobile.*static" 2>/dev/null || true
PIDS=$(lsof -ti :$PORT 2>/dev/null || true)
[ -n "$PIDS" ] && kill -9 $PIDS 2>/dev/null || true

for i in $(seq 1 10); do
  if ! lsof -ti :$PORT > /dev/null 2>&1; then break; fi
  sleep 1
done

if lsof -ti :$PORT > /dev/null 2>&1; then
  echo "  ❌ 포트 $PORT 해제 실패: lsof -ti :$PORT | xargs kill -9"
  exit 1
fi

EXPO_PUBLIC_API_URL="${EXPO_PUBLIC_API_URL:-http://3.38.146.1:3100/v1}"

echo "📱 Expo Web 빌드 시작 (2~3분 소요됩니다)..."
echo "  API: $EXPO_PUBLIC_API_URL"

cd "$ROOT/apps/mobile"
CI=1 EXPO_PUBLIC_API_URL="$EXPO_PUBLIC_API_URL" \
  npx expo export --platform web --output-dir "$DIST" 2>&1 | tee "$LOG"

if [ ! -f "$DIST/index.html" ]; then
  echo "  ❌ 빌드 실패. 로그 확인: $LOG"
  exit 1
fi

echo ""
echo "🌐 정적 서버 시작 중 (:$PORT)..."

node -e "
const http = require('http');
const fs   = require('fs');
const path = require('path');
const dir  = '$DIST';
const mime = {html:'text/html',js:'application/javascript',css:'text/css',json:'application/json',png:'image/png',svg:'image/svg+xml',ico:'image/x-icon',woff2:'font/woff2'};
http.createServer((req,res)=>{
  let f=path.join(dir,req.url.split('?')[0]);
  if(!fs.existsSync(f)||fs.statSync(f).isDirectory()) f=path.join(dir,'index.html');
  const ext=path.extname(f).slice(1);
  res.writeHead(200,{'Content-Type':mime[ext]||'text/plain'});
  fs.createReadStream(f).pipe(res);
}).listen($PORT,()=>console.log('ready'));
" > "$LOG" 2>&1 &
echo $! > "$PID_FILE"

sleep 2
if kill -0 "$(cat $PID_FILE)" 2>/dev/null; then
  echo "  ✅ 서버 시작됨 (PID: $(cat $PID_FILE))"
  echo "     앱:   http://localhost:$PORT"
  echo "     외부: http://3.38.146.1:$PORT"
else
  echo "  ❌ 서버 시작 실패. 로그 확인: $LOG"
  exit 1
fi
