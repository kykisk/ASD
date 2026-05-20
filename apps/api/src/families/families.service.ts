import { Injectable } from '@nestjs/common';
import { PrismaService } from '@auticare/prisma-client';
import { ApiException } from '../common/exceptions/api.exception.js';
import type { CreateFamilyInput, UpdateFamilyInput, InviteMemberInput, UpdateMemberInput } from '@auticare/dto';

@Injectable()
export class FamiliesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateFamilyInput) {
    return this.prisma.family.create({
      data: {
        name: dto.name,
        members: {
          create: {
            userId,
            role: 'FAMILY_ADMIN',
          },
        },
      },
      include: {
        members: {
          include: { user: { select: { id: true, email: true, name: true } } },
        },
      },
    });
  }

  async findMyFamilies(userId: string) {
    return this.prisma.family.findMany({
      where: {
        members: { some: { userId } },
      },
      include: {
        members: {
          include: { user: { select: { id: true, email: true, name: true } } },
        },
      },
    });
  }

  async findOne(familyId: string, userId: string) {
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
      include: {
        members: {
          include: { user: { select: { id: true, email: true, name: true } } },
        },
      },
    });

    if (!family) {
      throw new ApiException(404, 'FAMILY_404', '가족을 찾을 수 없습니다');
    }

    const isMember = family.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw new ApiException(404, 'FAMILY_404', '가족을 찾을 수 없습니다');
    }

    return family;
  }

  async update(familyId: string, userId: string, dto: UpdateFamilyInput) {
    await this.verifyAdmin(familyId, userId);

    return this.prisma.family.update({
      where: { id: familyId },
      data: { name: dto.name },
      include: {
        members: {
          include: { user: { select: { id: true, email: true, name: true } } },
        },
      },
    });
  }

  async remove(familyId: string, userId: string) {
    await this.verifyAdmin(familyId, userId);

    await this.prisma.family.delete({ where: { id: familyId } });
    return { deleted: true };
  }

  async inviteMember(familyId: string, userId: string, dto: InviteMemberInput) {
    await this.verifyAdmin(familyId, userId);

    const targetUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!targetUser) {
      throw new ApiException(404, 'USER_404', '해당 이메일의 사용자를 찾을 수 없습니다');
    }

    const existing = await this.prisma.familyMember.findUnique({
      where: { userId_familyId: { userId: targetUser.id, familyId } },
    });

    if (existing) {
      throw new ApiException(409, 'MEMBER_EXISTS', '이미 가족 구성원입니다');
    }

    return this.prisma.familyMember.create({
      data: {
        userId: targetUser.id,
        familyId,
        role: dto.role ?? 'FAMILY_MEMBER',
      },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
  }

  async updateMember(
    familyId: string,
    userId: string,
    memberId: string,
    dto: UpdateMemberInput,
  ) {
    await this.verifyAdmin(familyId, userId);

    const member = await this.prisma.familyMember.findFirst({
      where: { id: memberId, familyId },
    });

    if (!member) {
      throw new ApiException(404, 'MEMBER_404', '가족 구성원을 찾을 수 없습니다');
    }

    return this.prisma.familyMember.update({
      where: { id: memberId },
      data: { role: dto.role },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
  }

  async removeMember(familyId: string, userId: string, memberId: string) {
    await this.verifyAdmin(familyId, userId);

    const member = await this.prisma.familyMember.findFirst({
      where: { id: memberId, familyId },
    });

    if (!member) {
      throw new ApiException(404, 'MEMBER_404', '가족 구성원을 찾을 수 없습니다');
    }

    if (member.userId === userId) {
      throw new ApiException(400, 'CANNOT_REMOVE_SELF', '자기 자신을 제거할 수 없습니다');
    }

    await this.prisma.familyMember.delete({ where: { id: memberId } });
    return { deleted: true };
  }

  private async verifyAdmin(familyId: string, userId: string) {
    const membership = await this.prisma.familyMember.findUnique({
      where: { userId_familyId: { userId, familyId } },
    });

    if (!membership) {
      throw new ApiException(404, 'FAMILY_404', '가족을 찾을 수 없습니다');
    }

    if (membership.role !== 'FAMILY_ADMIN') {
      throw new ApiException(403, 'FORBIDDEN', '권한이 없습니다');
    }

    return membership;
  }
}
