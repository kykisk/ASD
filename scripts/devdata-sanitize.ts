/**
 * devdata 스냅샷용 정리 (scripts/export-devdata.sh 에서 임시 DB 에 대해 실행)
 *
 * - Child: 실제 키로 복호화 → 이름 마스킹("아이N") → 개발용 키로 재암호화 (생년월일 유지)
 * - AiConfig: 암호화된 API 키 제거
 * - User: 전화번호 제거, 비밀번호를 Dev123!@# 로 통일 (admin@auticare.com 제외)
 * - RefreshToken / DeviceToken 삭제, AuditLog / LegalConsent 의 IP·UserAgent 제거
 *
 * 필요 환경변수: DATABASE_URL(임시 DB), REAL_ENCRYPTION_KEY, DEV_ENCRYPTION_KEY
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { EncryptionService } from '../libs/encryption/src/index.js';

const DEV_PASSWORD = 'Dev123!@#';
const ADMIN_EMAIL = 'admin@auticare.com';

function encryptionWith(keyBase64: string): EncryptionService {
  const prev = process.env['ENCRYPTION_MASTER_KEY'];
  process.env['ENCRYPTION_MASTER_KEY'] = keyBase64;
  const service = new EncryptionService();
  service.onModuleInit();
  process.env['ENCRYPTION_MASTER_KEY'] = prev;
  return service;
}

async function main() {
  const databaseUrl = process.env['DATABASE_URL'];
  const realKey = process.env['REAL_ENCRYPTION_KEY'];
  const devKey = process.env['DEV_ENCRYPTION_KEY'];
  if (!databaseUrl || !realKey || !devKey) {
    throw new Error('DATABASE_URL, REAL_ENCRYPTION_KEY, DEV_ENCRYPTION_KEY are required');
  }
  if (!databaseUrl.includes('auticare_devdata')) {
    throw new Error('Refusing to sanitize a database other than auticare_devdata');
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  const real = encryptionWith(realKey);
  const dev = encryptionWith(devKey);

  try {
    const children = await prisma.child.findMany({ orderBy: { createdAt: 'asc' } });
    let n = 0;
    for (const child of children) {
      n += 1;
      const pii = await real.decryptPii({
        ciphertext: child.nameEnc,
        iv: child.encIv,
        authTag: child.encAuthTag,
        salt: child.encSalt,
      });
      const enc = await dev.encryptPii({ name: `아이${n}`, birthDate: pii.birthDate });
      await prisma.child.update({
        where: { id: child.id },
        data: {
          nameEnc: enc.ciphertext,
          encIv: enc.iv,
          encAuthTag: enc.authTag,
          encSalt: enc.salt,
        },
      });
    }

    const aiConfigs = await prisma.aiConfig.updateMany({
      data: {
        encApiKey: null,
        encRegion: null,
        encAccessKeyId: null,
        encSecretKey: null,
        encIv: null,
        encAuthTag: null,
        encSalt: null,
      },
    });

    const devHash = await bcrypt.hash(DEV_PASSWORD, 12);
    const users = await prisma.user.updateMany({
      where: { email: { not: ADMIN_EMAIL } },
      data: { passwordHash: devHash, phone: null },
    });

    await prisma.refreshToken.deleteMany();
    await prisma.deviceToken.deleteMany();
    await prisma.auditLog.updateMany({ data: { ipAddress: null, userAgent: null } });
    await prisma.legalConsent.updateMany({ data: { ipAddress: null, userAgent: null } });

    console.log(
      `sanitized: children=${children.length}, users=${users.count}, aiConfigs=${aiConfigs.count}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
