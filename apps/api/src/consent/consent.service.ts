import { Injectable } from '@nestjs/common';
import { PrismaService } from '@auticare/prisma-client';
import type { RecordConsentInput } from '@auticare/dto';
import type { LegalConsent } from '@prisma/client';

const CURRENT_VERSIONS: Record<string, string> = {
  TERMS_OF_SERVICE: '1.0',
  PRIVACY_POLICY: '1.0',
  LICENSED_TOOL_USE: '1.0',
};

@Injectable()
export class ConsentService {
  constructor(private prisma: PrismaService) {}

  async record(
    userId: string,
    dto: RecordConsentInput,
    ipAddress: string,
    userAgent: string,
  ): Promise<LegalConsent> {
    return this.prisma.legalConsent.create({
      data: {
        userId,
        consentType: dto.consentType,
        consentVersion: dto.consentVersion,
        ipAddress,
        userAgent,
        consentedAt: new Date(),
      },
    });
  }

  async hasConsented(
    userId: string,
    consentType: string,
    version: string,
  ): Promise<boolean> {
    const consent = await this.prisma.legalConsent.findFirst({
      where: {
        userId,
        consentType,
        consentVersion: version,
      },
    });
    return consent !== null;
  }

  async getUserConsents(userId: string): Promise<LegalConsent[]> {
    return this.prisma.legalConsent.findMany({
      where: { userId },
      orderBy: { consentedAt: 'desc' },
    });
  }

  getCurrentVersions(): Record<string, string> {
    return CURRENT_VERSIONS;
  }
}
