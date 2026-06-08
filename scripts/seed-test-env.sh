#!/bin/bash
# AutiCare 테스트 환경 시드 스크립트
# 실제 데이터를 지우고 더미 데이터로 채웁니다
# 사용법: ./scripts/seed-test-env.sh

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="$HOME/.local/node_modules/.bin:$HOME/.local/share/pnpm:$PATH"

echo "⚠️  경고: 현재 DB의 모든 사용자/가족/아이 데이터를 삭제하고"
echo "         테스트용 더미 데이터로 교체합니다."
echo ""
read -p "계속하시겠습니까? (yes 입력): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "취소됐습니다."
  exit 0
fi

echo ""
echo "🗑️  기존 사용자 데이터 정리 중..."

PGPASSWORD="${PGPASSWORD:-auticare}" psql \
  -h localhost -p 5433 -U auticare -d auticare 2>/dev/null << 'SQL'
-- 외래키 의존 순서대로 삭제 (admin 계정 제외)
DELETE FROM "LegalConsent" WHERE "userId" NOT IN (SELECT id FROM "User" WHERE role = 'SYSTEM_ADMIN');
DELETE FROM "RefreshToken" WHERE "userId" NOT IN (SELECT id FROM "User" WHERE role = 'SYSTEM_ADMIN');
DELETE FROM "DeviceToken" WHERE "userId" NOT IN (SELECT id FROM "User" WHERE role = 'SYSTEM_ADMIN');
DELETE FROM "AuditLog" WHERE "userId" NOT IN (SELECT id FROM "User" WHERE role = 'SYSTEM_ADMIN');
DELETE FROM "FamilyMember" WHERE "userId" NOT IN (SELECT id FROM "User" WHERE role = 'SYSTEM_ADMIN');
DELETE FROM "Family";
DELETE FROM "User" WHERE role != 'SYSTEM_ADMIN';
SQL

echo "✅ 기존 데이터 정리 완료"
echo ""
echo "🌱 테스트 더미 데이터 생성 중..."

PGPASSWORD="${PGPASSWORD:-auticare}" psql \
  -h localhost -p 5433 -U auticare -d auticare 2>/dev/null << 'SQL'

-- 테스트 사용자 1 (부모)
INSERT INTO "User" (id, email, "passwordHash", name, role, "isActive", "createdAt", "updatedAt")
VALUES (
  'test-user-001',
  'tester1@auticare-test.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhsVVFiWDL4RGHJ8Fq5tDW',  -- Test1234!
  '테스터 김철수',
  'USER',
  true,
  NOW(), NOW()
) ON CONFLICT (email) DO NOTHING;

-- 테스트 사용자 2 (부모)
INSERT INTO "User" (id, email, "passwordHash", name, role, "isActive", "createdAt", "updatedAt")
VALUES (
  'test-user-002',
  'tester2@auticare-test.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhsVVFiWDL4RGHJ8Fq5tDW',  -- Test1234!
  '테스터 이영희',
  'USER',
  true,
  NOW(), NOW()
) ON CONFLICT (email) DO NOTHING;

-- 테스트 가족 1
INSERT INTO "Family" (id, name, "createdAt", "updatedAt")
VALUES ('test-family-001', '김철수 가족', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 테스트 가족 2
INSERT INTO "Family" (id, name, "createdAt", "updatedAt")
VALUES ('test-family-002', '이영희 가족', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 가족 멤버십
INSERT INTO "FamilyMember" (id, "userId", "familyId", role, "joinedAt")
VALUES ('test-member-001', 'test-user-001', 'test-family-001', 'FAMILY_ADMIN', NOW())
ON CONFLICT DO NOTHING;

INSERT INTO "FamilyMember" (id, "userId", "familyId", role, "joinedAt")
VALUES ('test-member-002', 'test-user-002', 'test-family-002', 'FAMILY_ADMIN', NOW())
ON CONFLICT DO NOTHING;

SQL

echo "✅ 더미 데이터 생성 완료"
echo ""
echo "────────────────────────────────────────"
echo "📋 테스트 계정 정보"
echo ""
echo "  계정 1:"
echo "  이메일: tester1@auticare-test.com"
echo "  비밀번호: Test1234!"
echo ""
echo "  계정 2:"
echo "  이메일: tester2@auticare-test.com"
echo "  비밀번호: Test1234!"
echo ""
echo "  Admin:"
echo "  이메일: admin@auticare.com"
echo "  비밀번호: Admin123!@#"
echo "────────────────────────────────────────"
echo ""
echo "⚠️  테스터에게 공유 시 반드시 아래 안내사항 전달:"
echo "  - 실제 아동 정보를 입력하지 마세요"
echo "  - 테스트용 가상 데이터만 사용하세요"
echo "  - 테스트 종료 후 계정은 삭제됩니다"
