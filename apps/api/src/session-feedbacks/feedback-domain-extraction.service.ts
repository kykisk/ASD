import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@auticare/prisma-client';
import { AIService } from '../ai/ai.service.js';
import { z } from 'zod';

const DOMAINS = ['COMMUNICATION', 'SOCIAL', 'MOTOR', 'COGNITIVE', 'EMOTIONAL'] as const;

const domainScoreSchema = z.object({
  COMMUNICATION: z.number().min(1).max(5).nullable().default(null),
  SOCIAL: z.number().min(1).max(5).nullable().default(null),
  MOTOR: z.number().min(1).max(5).nullable().default(null),
  COGNITIVE: z.number().min(1).max(5).nullable().default(null),
  EMOTIONAL: z.number().min(1).max(5).nullable().default(null),
});

type DomainScores = z.infer<typeof domainScoreSchema>;

const DOMAIN_LABELS: Record<string, string> = {
  COMMUNICATION: '의사소통',
  SOCIAL: '사회성',
  MOTOR: '운동',
  COGNITIVE: '인지',
  EMOTIONAL: '정서',
};

@Injectable()
export class FeedbackDomainExtractionService {
  private readonly logger = new Logger(FeedbackDomainExtractionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
  ) {}

  /** fire-and-forget: SessionFeedback 저장 후 비동기 호출 */
  async extractAsync(feedbackId: string): Promise<void> {
    this.extractAndSave(feedbackId).catch((err) => {
      this.logger.warn(
        `Domain extraction failed for feedback ${feedbackId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    });
  }

  private async extractAndSave(feedbackId: string): Promise<void> {
    const feedback = await this.prisma.sessionFeedback.findUnique({
      where: { id: feedbackId },
    });
    if (!feedback || feedback.aiExtracted) return;

    // 텍스트 조합
    const parts: string[] = [];
    if (feedback.content) parts.push(feedback.content);
    if (feedback.progress) parts.push(`잘한 점: ${feedback.progress}`);
    if (feedback.challenges) parts.push(`어려웠던 점: ${feedback.challenges}`);
    if (feedback.parentNote) parts.push(`부모 메모: ${feedback.parentNote}`);
    const text = parts.join('\n');

    if (text.length < 10) return; // 너무 짧으면 건너뜀

    const prompt = `아이의 치료/일상 피드백을 읽고 5개 발달 도메인 점수를 추출하세요.

피드백:
${text}

도메인 기준:
- COMMUNICATION(의사소통): 말하기, 표현, 이해, 언어
- SOCIAL(사회성): 눈맞춤, 상호작용, 친구관계, 공유
- MOTOR(운동): 대근육, 소근육, 신체활동
- COGNITIVE(인지): 집중, 이해, 문제해결, 학습
- EMOTIONAL(정서): 감정조절, 기분, 불안, 자기조절

점수 기준: 1=매우 어려움, 2=어려움, 3=보통, 4=좋음, 5=매우 좋음
정보가 없는 도메인은 null로 표시하세요.

JSON으로만 응답하세요 (코드블록 없이):
{"COMMUNICATION":null,"SOCIAL":null,"MOTOR":null,"COGNITIVE":null,"EMOTIONAL":null}`;

    const scores = await this.aiService.generateStructured(
      {
        messages: [
          {
            role: 'system',
            content: '발달 도메인 점수 추출 전문가. JSON으로만 응답.',
          },
          { role: 'user', content: prompt },
        ],
        maxTokens: 100,
      },
      domainScoreSchema,
      undefined,
      undefined,
      'FEEDBACK_DOMAIN_EXTRACTION',
    );

    // null 아닌 점수만 추출
    const validScores = Object.entries(scores).filter(([, v]) => v !== null) as [string, number][];
    if (validScores.length === 0) {
      // 추출 실패해도 aiExtracted만 true로
      await this.prisma.sessionFeedback.update({
        where: { id: feedbackId },
        data: { aiExtracted: true, aiDomainScores: {} },
      });
      return;
    }

    // Assessment용 시스템 질문지 가져오거나 생성
    const questionnaire = await this.getOrCreateSystemQuestionnaire(
      feedback.childId,
      feedback.familyId,
    );

    // Assessment 생성
    const assessment = await this.prisma.assessment.create({
      data: {
        childId: feedback.childId,
        familyId: feedback.familyId,
        userId: feedback.userId,
        questionnaireId: questionnaire.id,
        totalScore:
          validScores.length > 0
            ? Math.round((validScores.reduce((s, [, v]) => s + v, 0) / validScores.length) * 10) /
              10
            : null,
        notes: `AI 자동 추출 (피드백: ${feedbackId.slice(0, 8)})`,
      },
    });

    // AssessmentScore 생성 (null이 아닌 도메인만)
    const itemMap = new Map(questionnaire.items.map((item) => [item.domain, item.id]));

    await this.prisma.assessmentScore.createMany({
      data: validScores
        .filter(([domain]) => itemMap.has(domain))
        .map(([domain, score]) => ({
          assessmentId: assessment.id,
          itemId: itemMap.get(domain)!,
          domain,
          score,
        })),
    });

    // SessionFeedback 업데이트
    await this.prisma.sessionFeedback.update({
      where: { id: feedbackId },
      data: {
        aiExtracted: true,
        aiDomainScores: scores as unknown as Record<string, unknown>,
      },
    });

    this.logger.debug(`Domain extraction done for feedback ${feedbackId}`);
  }

  private async getOrCreateSystemQuestionnaire(childId: string, familyId: string) {
    const existing = await this.prisma.questionnaire.findFirst({
      where: {
        familyId,
        name: 'AI 발달 추출',
        type: 'NON_LICENSED_USER_INPUT',
      },
      include: { items: true },
    });
    if (existing) return existing;

    return this.prisma.questionnaire.create({
      data: {
        familyId,
        name: 'AI 발달 추출',
        description: '피드백에서 자동 추출된 도메인 평가',
        type: 'NON_LICENSED_USER_INPUT',
        domains: [...DOMAINS],
        isActive: true,
        items: {
          create: DOMAINS.map((domain, idx) => ({
            text: DOMAIN_LABELS[domain],
            domain,
            orderIndex: idx,
            minScore: 1,
            maxScore: 5,
          })),
        },
      },
      include: { items: true },
    });
  }
}
