import { Injectable } from '@nestjs/common';
import { PrismaService } from '@auticare/prisma-client';

@Injectable()
export class FamilyResolverService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(userId: string, jwtFamilyId: string | null | undefined): Promise<string | null> {
    if (jwtFamilyId) return jwtFamilyId;
    const member = await this.prisma.familyMember.findFirst({
      where: { userId },
      select: { familyId: true },
    });
    return member?.familyId ?? null;
  }
}
