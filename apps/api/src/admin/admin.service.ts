import { Injectable } from '@nestjs/common';
import { PrismaService } from '@auticare/prisma-client';
import { AiTier, UserRole } from '@prisma/client';
import { ApiException } from '../common/exceptions/api.exception.js';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(params?: { search?: string; role?: string; status?: string; page?: number; limit?: number }) {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (params?.search) {
      where.OR = [
        { email: { contains: params.search, mode: 'insensitive' } },
        { name: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    if (params?.role) where.role = params.role;
    if (params?.status === 'active') where.isActive = true;
    if (params?.status === 'inactive') where.isActive = false;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data: users, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async updateUserRole(userId: string, role: string) {
    const validRoles = Object.values(UserRole);
    if (!validRoles.includes(role as UserRole)) {
      throw new ApiException(400, 'USER_001', `유효하지 않은 역할입니다: ${role}`);
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { role: role as UserRole },
      select: { id: true, email: true, name: true, role: true },
    });
  }

  async toggleUserStatus(userId: string, isActive: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: { id: true, email: true, name: true, isActive: true },
    });
  }

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
