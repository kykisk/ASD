import { Injectable } from '@nestjs/common';
import { PrismaService } from '@auticare/prisma-client';
import { AiConfigService } from '../ai-config/ai-config.service.js';
import { AiFeatureConfigService } from '../ai-config/ai-feature-config.service.js';
import { ApiException } from '../common/exceptions/api.exception.js';

export interface SectionScore {
  name: string;
  score: number | null;
  unit?: string;
  percentile?: number | null;
}

export interface CreateClinicalReportInput {
  assessmentTool: string;
  assessmentDate?: string;
  evaluatorType?: string;
  institution?: string;
  sectionScores: SectionScore[];
  totalScore?: number;
  totalScoreUnit?: string;
  clinicalFindings?: string;
  source?: 'MANUAL' | 'IMAGE_IMPORT';
}

export interface ImageExtractionResult {
  assessmentTool: string;
  assessmentDate: string | null;
  evaluatorType: string | null;
  institution: string | null;
  sectionScores: SectionScore[];
  totalScore: number | null;
  totalScoreUnit: string | null;
  clinicalFindings: string | null;
}

const EXTRACTION_PROMPT = `이 이미지는 아동 임상 평가 결과서입니다.
다음 정보를 추출하여 순수 JSON만 반환하세요. 마크다운이나 코드 블록을 사용하지 마세요.
{"assessmentTool":"평가도구명","assessmentDate":"YYYY-MM-DD 또는 null","evaluatorType":"직종 또는 null","institution":"기관명 또는 null","sectionScores":[{"name":"섹션명","score":숫자또는null,"unit":"단위","percentile":백분위숫자또는null}],"totalScore":숫자또는null,"totalScoreUnit":"점 또는 null","clinicalFindings":"소견 전문 또는 null"}`;

@Injectable()
export class ClinicalReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiConfigService: AiConfigService,
    private readonly aiFeatureConfigService: AiFeatureConfigService,
  ) {}

  async create(childId: string, input: CreateClinicalReportInput) {
    const child = await this.prisma.child.findUnique({ where: { id: childId } });
    if (!child) throw new ApiException(404, 'CHILD_404', '아이를 찾을 수 없습니다');

    return this.prisma.clinicalReport.create({
      data: {
        childId,
        assessmentTool: input.assessmentTool,
        assessmentDate: input.assessmentDate ? new Date(input.assessmentDate) : null,
        evaluatorType: input.evaluatorType ?? null,
        institution: input.institution ?? null,
        sectionScores: input.sectionScores as unknown as Record<string, unknown>[],
        totalScore: input.totalScore ?? null,
        totalScoreUnit: input.totalScoreUnit ?? null,
        clinicalFindings: input.clinicalFindings ?? null,
        source: input.source ?? 'MANUAL',
      },
    });
  }

  async findByChild(childId: string) {
    return this.prisma.clinicalReport.findMany({
      where: { childId },
      orderBy: [{ assessmentDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async remove(id: string) {
    const report = await this.prisma.clinicalReport.findUnique({ where: { id } });
    if (!report) throw new ApiException(404, 'REPORT_404', '보고서를 찾을 수 없습니다');
    await this.prisma.clinicalReport.delete({ where: { id } });
  }

  async extractFromImage(
    images: Array<{ base64: string; mimeType: string }>,
  ): Promise<ImageExtractionResult> {
    const config = await this.getVisionConfig();
    const content: unknown[] = [];
    for (const img of images) {
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: img.mimeType, data: img.base64 },
      });
    }
    content.push({ type: 'text', text: EXTRACTION_PROMPT });

    const body = {
      model: config.modelId ?? 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{ role: 'user', content }],
    };

    const rawText = await this.callClaudeApi(body, config);
    return this.parseExtraction(rawText);
  }

  private async getVisionConfig() {
    const configId =
      await this.aiFeatureConfigService.getConfigIdForFeature('CLINICAL_REPORT_IMPORT');
    if (configId) {
      const d = await this.aiConfigService.getDecryptedConfig(configId);
      return {
        provider: d.provider,
        apiKey: d.apiKey ?? undefined,
        region: d.region ?? undefined,
        accessKeyId: d.accessKeyId ?? undefined,
        secretKey: d.secretKey ?? undefined,
        modelId: d.modelId ?? undefined,
      };
    }
    try {
      const d = await this.aiConfigService.getDecryptedDefaultConfig();
      if (d.provider === 'CLAUDE_DIRECT' || d.provider === 'CLAUDE_BEDROCK') {
        return {
          provider: d.provider,
          apiKey: d.apiKey ?? undefined,
          region: d.region ?? undefined,
          accessKeyId: d.accessKeyId ?? undefined,
          secretKey: d.secretKey ?? undefined,
          modelId: d.modelId ?? undefined,
        };
      }
    } catch (_) {
      void _;
    }
    throw new ApiException(
      503,
      'AI_VISION_003',
      'Vision AI를 사용하려면 Claude 프로바이더가 필요합니다',
    );
  }

  private async callClaudeApi(
    body: unknown,
    config: {
      provider: string;
      apiKey?: string;
      region?: string;
      accessKeyId?: string;
      secretKey?: string;
    },
  ): Promise<string> {
    if (config.provider === 'CLAUDE_DIRECT' && config.apiKey) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new ApiException(503, 'AI_VISION_001', `Claude API 오류: ${res.status}`);
      const data = (await res.json()) as { content: Array<{ text: string }> };
      return data.content[0]?.text ?? '';
    }
    if (config.provider === 'CLAUDE_BEDROCK' && config.accessKeyId && config.secretKey) {
      const { BedrockRuntimeClient, InvokeModelCommand } =
        await import('@aws-sdk/client-bedrock-runtime');
      const client = new BedrockRuntimeClient({
        region: config.region ?? 'us-east-1',
        credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretKey },
      });
      const { model: modelId, ...bodyWithoutModel } = body as {
        model: string;
        [k: string]: unknown;
      };
      const command = new InvokeModelCommand({
        modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({ ...bodyWithoutModel, anthropic_version: 'bedrock-2023-05-31' }),
      });
      const response = await client.send(command);
      const decoded = JSON.parse(new TextDecoder().decode(response.body)) as {
        content: Array<{ text: string }>;
      };
      return decoded.content[0]?.text ?? '';
    }
    throw new ApiException(503, 'AI_VISION_002', 'Vision AI 프로바이더가 설정되지 않았습니다');
  }

  private parseExtraction(rawText: string): ImageExtractionResult {
    const stripped = rawText.trim();
    const fenceMatch = stripped.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```\s*$/);
    const jsonStr = fenceMatch
      ? fenceMatch[1].trim()
      : (stripped.match(/\{[\s\S]*\}/)?.[0] ?? stripped);
    try {
      return JSON.parse(jsonStr) as ImageExtractionResult;
    } catch {
      throw new ApiException(
        422,
        'AI_VISION_004',
        '이미지에서 결과서를 인식할 수 없습니다. 선명한 이미지를 사용해주세요.',
      );
    }
  }
}
