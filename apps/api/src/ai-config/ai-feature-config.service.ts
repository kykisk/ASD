import { Injectable } from '@nestjs/common';
import { PrismaService } from '@auticare/prisma-client';

const FEATURES = [
  'CURRICULUM',
  'INSIGHT',
  'SCHEDULE_SUGGEST',
  'QUESTIONNAIRE_GENERATE',
  'QUESTIONNAIRE_FILTER',
  'IMAGE_QUESTIONNAIRE',
  'RESEARCH_SUMMARIZE',
  'RESEARCH_DIGEST',
  'WELLBEING',
  'SENSORY',
  'EMERGENCY',
  'CLINICAL_REPORT_IMPORT',
  'FEEDBACK_DIGEST',
];

@Injectable()
export class AiFeatureConfigService {
  constructor(private prisma: PrismaService) {}

  async getAll(): Promise<Array<{ feature: string; configId: string | null }>> {
    const mappings = await this.prisma.aiFeatureConfig.findMany();
    return FEATURES.map((f) => ({
      feature: f,
      configId: mappings.find((m) => m.feature === f)?.configId ?? null,
    }));
  }

  async saveAll(mappings: Array<{ feature: string; configId: string | null }>): Promise<void> {
    for (const { feature, configId } of mappings) {
      if (configId) {
        await this.prisma.aiFeatureConfig.upsert({
          where: { feature },
          create: { feature, configId },
          update: { configId },
        });
      } else {
        await this.prisma.aiFeatureConfig.deleteMany({ where: { feature } });
      }
    }
  }

  async getConfigIdForFeature(feature: string): Promise<string | null> {
    const mapping = await this.prisma.aiFeatureConfig.findUnique({ where: { feature } });
    return mapping?.configId ?? null;
  }
}
