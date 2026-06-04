import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@auticare/prisma-client';
import { AIService } from '../ai/ai.service.js';
import { ApiException } from '../common/exceptions/api.exception.js';

interface CreateProfileInput {
  visual: number;
  auditory: number;
  tactile: number;
  vestibular: number;
  proprioception: number;
  olfactory: number;
  notes?: string;
}

@Injectable()
export class SensoryService {
  private readonly logger = new Logger(SensoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
  ) {}

  async createProfile(childId: string, familyId: string, input: CreateProfileInput) {
    const scores = [
      input.visual,
      input.auditory,
      input.tactile,
      input.vestibular,
      input.proprioception,
      input.olfactory,
    ];
    for (const score of scores) {
      if (score < 1 || score > 5) {
        throw new ApiException(400, 'SENSORY_001', '감각 점수는 1-5 사이여야 합니다');
      }
    }

    let aiRecommendations: string | null = null;
    try {
      const response = await this.aiService.generate({
        messages: [
          {
            role: 'system',
            content: '당신은 자폐 아동의 감각 처리 전문가입니다.',
          },
          {
            role: 'user',
            content: `감각 프로파일 (1=과민, 3=보통, 5=둔감):\n시각: ${input.visual}, 청각: ${input.auditory}, 촉각: ${input.tactile}\n전정감각: ${input.vestibular}, 고유감각: ${input.proprioception}, 후각: ${input.olfactory}\n\n이 아이에게 맞는 감각 통합 활동 3가지를 추천해주세요. 각 활동은 한 줄로 작성하세요.`,
          },
        ],
        maxTokens: 300,
      });
      aiRecommendations = response.content;
    } catch (err) {
      this.logger.warn(
        `AI recommendations failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const profile = await this.prisma.sensoryProfile.create({
      data: {
        childId,
        familyId,
        visual: input.visual,
        auditory: input.auditory,
        tactile: input.tactile,
        vestibular: input.vestibular,
        proprioception: input.proprioception,
        olfactory: input.olfactory,
        notes: input.notes,
        aiRecommendations,
      },
    });

    return profile;
  }

  async getProfiles(childId: string, userId: string, limit = 10) {
    return this.prisma.sensoryProfile.findMany({
      where: { childId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getLatest(childId: string, userId: string) {
    const profile = await this.prisma.sensoryProfile.findFirst({
      where: { childId },
      orderBy: { createdAt: 'desc' },
    });

    if (!profile) {
      throw new ApiException(404, 'SENSORY_002', '감각 프로파일이 없습니다');
    }

    return profile;
  }

  async getTrends(childId: string, userId: string) {
    const profiles = await this.prisma.sensoryProfile.findMany({
      where: { childId },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });

    return {
      profiles: profiles.reverse(),
      channels: ['visual', 'auditory', 'tactile', 'vestibular', 'proprioception', 'olfactory'],
    };
  }
}
