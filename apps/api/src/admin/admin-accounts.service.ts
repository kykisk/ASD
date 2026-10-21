import { Injectable } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import bcrypt from 'bcrypt';
import { PrismaService } from '@auticare/prisma-client';
import { ApiException } from '../common/exceptions/api.exception.js';

const BCRYPT_ROUNDS = 12;
// 헷갈리는 글자(0/O, 1/l/I)는 빼서 전화로 불러주기 쉽게
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnpqrstuvwxyz';
const DIGITS = '23456789';
const SYMBOLS = '!@#$%';

function pick(chars: string, n: number): string {
  let out = '';
  for (let i = 0; i < n; i++) out += chars[randomInt(chars.length)];
  return out;
}

/** 비밀번호 정책(대·소문자·숫자·특수문자, 8자 이상)을 만족하는 12자 임시 비밀번호 */
export function generateTempPassword(): string {
  const chars = [...pick(UPPER, 3), ...pick(LOWER, 5), ...pick(DIGITS, 3), ...pick(SYMBOLS, 1)];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

/** 관리자 › 사용자 · 가족: 임시 비밀번호 발급, 테스트 계정 정리 */
@Injectable()
export class AdminAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  /** 임시 비밀번호를 발급하고 모든 세션을 끊음. 다음 로그인 때 새 비밀번호로 바꾸게 함 */
  async issueTempPassword(userId: string): Promise<{ email: string; tempPassword: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ApiException(404, 'USER_404', '사용자를 찾을 수 없습니다');
    if (user.role === 'SYSTEM_ADMIN') {
      throw new ApiException(400, 'ADMIN_001', '관리자 계정은 여기서 바꿀 수 없습니다');
    }

    const tempPassword = generateTempPassword();
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash: await bcrypt.hash(tempPassword, BCRYPT_ROUNDS),
          mustChangePassword: true,
        },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { email: user.email, tempPassword };
  }

  /**
   * 계정 삭제 (테스트 계정 정리용). 이메일을 한 번 더 입력해야 하고,
   * 그 사람만 있는 가족이면 가족·아이·기록까지 모두 지운다. 다른 사람과 함께 쓰는 가족은 남긴다.
   */
  async deleteUser(userId: string, confirmEmail: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { familyMembers: { select: { familyId: true } } },
    });
    if (!user) throw new ApiException(404, 'USER_404', '사용자를 찾을 수 없습니다');
    if (user.role === 'SYSTEM_ADMIN') {
      throw new ApiException(400, 'ADMIN_001', '관리자 계정은 지울 수 없습니다');
    }
    if (confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
      throw new ApiException(400, 'ADMIN_002', '확인용 이메일이 일치하지 않습니다');
    }

    const soloFamilyIds: string[] = [];
    for (const { familyId } of user.familyMembers) {
      const members = await this.prisma.familyMember.count({ where: { familyId } });
      if (members === 1) soloFamilyIds.push(familyId);
    }
    const children = await this.prisma.child.findMany({
      where: { familyId: { in: soloFamilyIds } },
      select: { id: true },
    });
    const childIds = children.map((c) => c.id);

    // 아이에 묶인 기록 중 자동으로 지워지지 않는 것부터 지운 뒤 가족 → 계정 순서로
    await this.prisma.$transaction([
      this.prisma.activityLog.deleteMany({ where: { childId: { in: childIds } } }),
      this.prisma.sessionFeedback.deleteMany({ where: { childId: { in: childIds } } }),
      this.prisma.curriculum.deleteMany({ where: { childId: { in: childIds } } }),
      this.prisma.assessment.deleteMany({ where: { childId: { in: childIds } } }),
      this.prisma.family.deleteMany({ where: { id: { in: soloFamilyIds } } }),
      this.prisma.user.delete({ where: { id: userId } }),
    ]);

    return {
      email: user.email,
      deletedFamilies: soloFamilyIds.length,
      deletedChildren: childIds.length,
    };
  }
}
