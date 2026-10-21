/** Claude Messages API 응답 (사진 인식처럼 SDK 없이 직접 부르는 곳용) */
export interface ClaudeMessageResponse {
  model?: string;
  content?: Array<{ type: string; text?: string }>;
  usage?: { input_tokens?: number; output_tokens?: number };
}

/** 최신 모델은 답 앞에 thinking 블록을 붙이므로 text 블록만 모은다 */
export function claudeText(response: ClaudeMessageResponse): string {
  return (response.content ?? [])
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('');
}

/** thinking 이 max_tokens 에 포함되므로 출력이 잘리지 않게 넉넉히 */
export const VISION_MAX_TOKENS = 16000;
export const VISION_DEFAULT_MODEL = 'claude-sonnet-5-5';
