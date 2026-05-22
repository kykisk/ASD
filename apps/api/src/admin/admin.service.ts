import { Injectable } from '@nestjs/common';
import { PrismaService } from '@auticare/prisma-client';
import { AiTier } from '@prisma/client';
import { ApiException } from '../common/exceptions/api.exception.js';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listFamilies() {
    const families = await this.prisma.family.findMany({
      include: {
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return families.map((f) => ({
      id: f.id,
      name: f.name,
      aiTier: f.aiTier,
      memberCount: f._count.members,
      createdAt: f.createdAt,
    }));
  }

  async updateFamilyTier(familyId: string, aiTier: string) {
    const validTiers: string[] = Object.values(AiTier);
    if (!validTiers.includes(aiTier)) {
      throw new ApiException(400, 'FAMILY_001', `유효하지 않은 AI 티어입니다: ${aiTier}`);
    }

    const family = await this.prisma.family.findUnique({ where: { id: familyId } });
    if (!family) {
      throw new ApiException(404, 'FAMILY_404', '가족을 찾을 수 없습니다');
    }

    return this.prisma.family.update({
      where: { id: familyId },
      data: { aiTier: aiTier as AiTier },
      select: { id: true, name: true, aiTier: true },
    });
  }
}
