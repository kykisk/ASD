import { Injectable } from '@nestjs/common';
import { PrismaService } from '@auticare/prisma-client';
import type { RecordConsentInput } from '@auticare/dto';
import type { LegalConsent } from '@prisma/client';
import { LicensedTool } from '@auticare/prisma-client';

const CURRENT_VERSIONS: Record<string, string> = {
  TERMS_OF_SERVICE: '1.0',
  PRIVACY_POLICY: '1.0',
  LICENSED_TOOL_USE_M_CHAT_R_F: '1.0',
  LICENSED_TOOL_USE_CARS_2: '1.0',
  LICENSED_TOOL_USE_ABC: '1.0',
  LICENSED_TOOL_USE_ADOS_2: '1.0',
  LICENSED_TOOL_USE_SCQ: '1.0',
};

interface ConsentDocument {
  version: string;
  title: string;
  content: string;
}

// 데모 동의서 (실제 운영 시 라이선스 구매 후 정확한 저작권 문구로 교체)
const CONSENT_DOCUMENTS: Record<string, ConsentDocument> = {
  LICENSED_TOOL_USE_M_CHAT_R_F: {
    version: '1.0',
    title: 'M-CHAT-R/F (수정된 자폐 체크리스트) 사용 동의',
    content: `M-CHAT-R/F (Modified Checklist for Autism in Toddlers, Revised with Follow-Up)는 Diana Robins, Deborah Fein, Marianne Barton이 개발한 저작물입니다.\n\n본 도구는 라이선스 계약 하에 사용되며, AutiCare 서비스 내에서만 활용됩니다. 평가 결과는 전문의 진단을 대체하지 않습니다.\n\n본 동의서에 동의함으로써 귀하는 도구의 저작권 및 사용 제한 조건을 이해하고 준수할 것을 확인합니다.`,
  },
  LICENSED_TOOL_USE_CARS_2: {
    version: '1.0',
    title: 'CARS-2 (아동기 자폐 평가 척도) 사용 동의',
    content: `CARS-2 (Childhood Autism Rating Scale, Second Edition)는 Eric Schopler, Mary E. Van Bourgondien, Glenna Janette Wellman, Steven R. Love가 개발하였으며 WPS(Western Psychological Services)가 출판한 저작물입니다.\n\n본 도구는 라이선스 계약 하에 사용되며, 훈련받은 전문가 또는 부모 보고 형식으로만 사용되어야 합니다. 평가 결과는 전문의 진단을 대체하지 않습니다.\n\n본 동의서에 동의함으로써 귀하는 도구의 저작권 및 사용 제한 조건을 이해하고 준수할 것을 확인합니다.`,
  },
  LICENSED_TOOL_USE_ABC: {
    version: '1.0',
    title: 'ABC (이상행동 체크리스트) 사용 동의',
    content: `ABC (Aberrant Behavior Checklist)는 Michael G. Aman과 Nirbhay N. Singh이 개발하고 Slosson Educational Publications가 출판한 저작물입니다.\n\n본 도구는 라이선스 계약 하에 사용되며, 지적장애 및 발달장애를 가진 개인의 행동 문제 평가에 활용됩니다. 평가 결과는 전문의 진단을 대체하지 않습니다.\n\n본 동의서에 동의함으로써 귀하는 도구의 저작권 및 사용 제한 조건을 이해하고 준수할 것을 확인합니다.`,
  },
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

  async hasConsented(userId: string, consentType: string, version: string): Promise<boolean> {
    const consent = await this.prisma.legalConsent.findFirst({
      where: { userId, consentType, consentVersion: version },
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

  // ── 라이선스 도구 전용 동의 ────────────────────────────────

  getToolConsentDocument(tool: LicensedTool): ConsentDocument | null {
    const key = `LICENSED_TOOL_USE_${tool}`;
    return CONSENT_DOCUMENTS[key] ?? null;
  }

  async recordToolConsent(
    userId: string,
    tool: LicensedTool,
    ipAddress: string,
    userAgent: string,
  ): Promise<LegalConsent> {
    const key = `LICENSED_TOOL_USE_${tool}`;
    const doc = CONSENT_DOCUMENTS[key];
    const version = CURRENT_VERSIONS[key] ?? '1.0';

    return this.prisma.legalConsent.create({
      data: {
        userId,
        consentType: key,
        consentVersion: version,
        documentContent: doc?.content ?? null,
        ipAddress,
        userAgent,
        consentedAt: new Date(),
      },
    });
  }

  async hasToolConsent(userId: string, tool: LicensedTool): Promise<boolean> {
    const key = `LICENSED_TOOL_USE_${tool}`;
    const version = CURRENT_VERSIONS[key] ?? '1.0';
    return this.hasConsented(userId, key, version);
  }
}
