#!/bin/bash
# 관리자 비밀번호 비상 재설정 (서버에서만).
# 비밀번호를 화면 · 파일 · 명령 기록에 남기지 않고 바꾸고, 로그인돼 있던 기기를 모두 로그아웃시킨다.
#
#   ./scripts/reset-admin-password.sh                  # 관리자가 한 명이면 그 계정
#   ./scripts/reset-admin-password.sh admin@example.com
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  set +u
  . "$NVM_DIR/nvm.sh" >/dev/null
  set -u
fi

if [ ! -f "$ROOT/.env" ]; then
  echo "❌ .env 파일이 없습니다."
  exit 1
fi
DATABASE_URL="$(grep -E '^DATABASE_URL=' "$ROOT/.env" | head -1 | cut -d= -f2- | tr -d '"')"
DB="${DATABASE_URL%%\?*}"

EMAIL="${1:-}"
if [ -z "$EMAIL" ]; then
  mapfile -t ADMINS < <(psql "$DB" -Atc "select email from \"User\" where role = 'SYSTEM_ADMIN' order by \"createdAt\"")
  if [ "${#ADMINS[@]}" -eq 0 ]; then
    echo "❌ 관리자 계정이 없습니다."
    exit 1
  elif [ "${#ADMINS[@]}" -gt 1 ]; then
    echo "관리자 계정이 여러 개예요. 이메일을 붙여서 실행하세요:"
    printf '  %s\n' "${ADMINS[@]}"
    exit 1
  fi
  EMAIL="${ADMINS[0]}"
fi

IS_ADMIN="$(psql "$DB" -Atv email="$EMAIL" <<'SQL'
select count(*) from "User" where email = :'email' and role = 'SYSTEM_ADMIN';
SQL
)"
if [ "$IS_ADMIN" != "1" ]; then
  echo "❌ $EMAIL 은(는) 관리자 계정이 아니에요."
  exit 1
fi

echo "관리자 계정: $EMAIL"
echo "새 비밀번호 규칙: 8자 이상 · 대문자 · 소문자 · 숫자 · 특수문자"
read -rsp "새 비밀번호: " PW1
echo
read -rsp "한 번 더: " PW2
echo

if [ "$PW1" != "$PW2" ]; then
  echo "❌ 두 번 입력한 비밀번호가 달라요."
  exit 1
fi
if [ "${#PW1}" -lt 8 ] || ! [[ "$PW1" =~ [A-Z] ]] || ! [[ "$PW1" =~ [a-z] ]] ||
  ! [[ "$PW1" =~ [0-9] ]] || ! [[ "$PW1" =~ [^A-Za-z0-9] ]]; then
  echo "❌ 규칙에 맞지 않아요 (8자 이상 · 대문자 · 소문자 · 숫자 · 특수문자)."
  exit 1
fi

# 비밀번호는 표준 입력으로만 넘김 (프로세스 목록에 안 보이게). API 와 같은 bcrypt 12
HASH="$(printf '%s' "$PW1" | node -e "
  const bcrypt = require('$ROOT/node_modules/bcrypt');
  let pw = '';
  process.stdin.on('data', (d) => (pw += d));
  process.stdin.on('end', () => bcrypt.hash(pw, 12).then((h) => console.log(h)));
")"
unset PW1 PW2

psql "$DB" -q -v email="$EMAIL" -v hash="$HASH" <<'SQL'
update "User"
   set "passwordHash" = :'hash', "mustChangePassword" = false, "isActive" = true
 where email = :'email' and role = 'SYSTEM_ADMIN';
update "RefreshToken" set "revokedAt" = now()
 where "userId" = (select id from "User" where email = :'email') and "revokedAt" is null;
SQL
unset HASH

echo "✅ $EMAIL 비밀번호를 바꿨어요. 로그인돼 있던 기기는 로그아웃됐어요."
echo "   비밀번호 관리자(브라우저 저장 등)에 꼭 저장해 두세요."
