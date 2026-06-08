import { Injectable, Logger } from '@nestjs/common';
import { AiConfigService } from '../ai-config/ai-config.service.js';
import { AiFeatureConfigService } from '../ai-config/ai-feature-config.service.js';
import { ApiException } from '../common/exceptions/api.exception.js';

export interface ExtractedItem {
  text: string;
  domain: string;
  score: number | null;
  description?: string;
}

export interface ImageExtractionResult {
  name: string;
  description: string | null;
  domains: string[];
  scaleType: string;
  items: ExtractedItem[];
}

const EXTRACTION_PROMPT = `이 이미지는 아동 발달 평가지 또는 질문지입니다.
이미지에서 다음 정보를 추출하세요:

1. 평가지/질문지 이름 (제목)
2. 각 문항의 텍스트
3. 각 문항이 평가하는 영역 (COMMUNICATION, SOCIAL, MOTOR, COGNITIVE, EMOTIONAL, DAILY_LIVING, OTHER 중 하나)
4. 이미 기입된 점수/답변이 있다면 (1-5 정수로 변환, 없으면 null)
5. 점수 척도 유형 (예: "1-5", "예/아니오", "0-3" 등)

반드시 순수 JSON만 반환하세요. 마크다운이나 코드 블록을 사용하지 마세요.
{"name":"평가지 이름","description":"설명 또는 null","scaleType":"1-5","domains":["SOCIAL","COGNITIVE"],"items":[{"text":"문항 내용","domain":"SOCIAL","score":3,"description":"보충 설명 또는 null"}]}`;

@Injectable()
export class ImageImportService {
  private readonly logger = new Logger(ImageImportService.name);

  constructor(
    private readonly aiConfigService: AiConfigService,
    private readonly aiFeatureConfigService: AiFeatureConfigService,
  ) {}

  async extractFromImage(imageBase64: string, mimeType: string): Promise<ImageExtractionResult> {
    const config = await this.getVisionConfig();

    const body = this.buildClaudeRequest(imageBase64, mimeType, config.modelId);
    const response = await this.callClaudeApi(body, config);

    return this.parseResponse(response);
  }

  async extractFromMultipleImages(
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
      max_tokens: 4000,
      messages: [{ role: 'user', content }],
    };

    const response = await this.callClaudeApi(body, config);
    return this.parseResponse(response);
  }

  private buildClaudeRequest(imageBase64: string, mimeType: string, modelId?: string) {
    return {
      model: modelId ?? 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType, data: imageBase64 },
            },
            { type: 'text', text: EXTRACTION_PROMPT },
          ],
        },
      ],
    };
  }

  private async callClaudeApi(
    body: unknown,
    config: {
      apiKey?: string;
      region?: string;
      accessKeyId?: string;
      secretKey?: string;
      provider: string;
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

      if (!res.ok) {
        const err = await res.text();
        this.logger.error(`Claude API error: ${res.status} ${err}`);
        throw new ApiException(503, 'AI_VISION_001', `AI Vision API 호출 실패: ${res.status}`);
      }

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

      const command = new InvokeModelCommand({
        modelId: (body as { model: string }).model,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({ ...(body as object), anthropic_version: 'bedrock-2023-05-31' }),
      });

      const response = await client.send(command);
      const decoded = JSON.parse(new TextDecoder().decode(response.body)) as {
        content: Array<{ text: string }>;
      };
      return decoded.content[0]?.text ?? '';
    }

    throw new ApiException(
      503,
      'AI_VISION_002',
      'Vision 지원 AI 프로바이더가 설정되지 않았습니다 (Claude Direct 또는 Bedrock 필요)',
    );
  }

  private async getVisionConfig() {
    const configId = await this.aiFeatureConfigService.getConfigIdForFeature('IMAGE_QUESTIONNAIRE');

    if (configId) {
      const decrypted = await this.aiConfigService.getDecryptedConfig(configId);
      return {
        provider: decrypted.provider,
        apiKey: decrypted.apiKey ?? undefined,
        region: decrypted.region ?? undefined,
        accessKeyId: decrypted.accessKeyId ?? undefined,
        secretKey: decrypted.secretKey ?? undefined,
        modelId: decrypted.modelId ?? undefined,
      };
    }

    const activeConfigs = await this.aiConfigService.getActiveConfigs();
    const claudeConfig = activeConfigs.find(
      (c) => c.provider === 'CLAUDE_DIRECT' || c.provider === 'CLAUDE_BEDROCK',
    );

    if (!claudeConfig) {
      throw new ApiException(
        503,
        'AI_VISION_003',
        'Vision AI를 사용하려면 Claude 프로바이더가 필요합니다',
      );
    }

    const decrypted = await this.aiConfigService.getDecryptedConfig(claudeConfig.id);
    return {
      provider: decrypted.provider,
      apiKey: decrypted.apiKey ?? undefined,
      region: decrypted.region ?? undefined,
      accessKeyId: decrypted.accessKeyId ?? undefined,
      secretKey: decrypted.secretKey ?? undefined,
      modelId: decrypted.modelId ?? undefined,
    };
  }

  private parseResponse(rawText: string): ImageExtractionResult {
    const jsonStr = this.extractJson(rawText);
    try {
      const parsed = JSON.parse(jsonStr) as ImageExtractionResult;

      if (!parsed.name || !Array.isArray(parsed.items) || parsed.items.length === 0) {
        throw new Error('필수 필드 누락');
      }

      const validDomains = [
        'COMMUNICATION',
        'SOCIAL',
        'MOTOR',
        'COGNITIVE',
        'EMOTIONAL',
        'DAILY_LIVING',
        'OTHER',
      ];
      const domains = new Set<string>();

      parsed.items = parsed.items.map((item, idx) => {
        const domain = validDomains.includes(item.domain) ? item.domain : 'OTHER';
        domains.add(domain);
        return {
          text: (item.text || '').slice(0, 500),
          domain,
          score:
            typeof item.score === 'number' && item.score >= 1 && item.score <= 5
              ? item.score
              : null,
          description: item.description || undefined,
        };
      });

      parsed.domains = Array.from(domains);
      parsed.description = parsed.description || null;
      parsed.scaleType = parsed.scaleType || '1-5';

      return parsed;
    } catch (err) {
      this.logger.error(`JSON parse failed: ${err instanceof Error ? err.message : String(err)}`);
      throw new ApiException(
        422,
        'AI_VISION_004',
        'AI 응답을 파싱할 수 없습니다. 이미지를 더 선명하게 촬영해주세요.',
      );
    }
  }

  private extractJson(content: string): string {
    const stripped = content.trim();
    const fenceMatch = stripped.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```\s*$/);
    if (fenceMatch) return fenceMatch[1].trim();
    const inlineFence = stripped.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (inlineFence) return inlineFence[1].trim();
    const braceMatch = stripped.match(/\{[\s\S]*\}/);
    if (braceMatch) return braceMatch[0];
    return stripped;
  }
}
