/** 수업 종류 코드(모바일·오늘 하루 기록) → 한글. 예전 웹 기록은 한글이 그대로 저장돼 있어 그대로 반환 */
const SESSION_TYPE_LABELS: Record<string, string> = {
  ABA: 'ABA',
  SPEECH: '언어치료',
  SENSORY: '감각통합',
  OCCUPATIONAL: '작업치료',
  BEHAVIORAL: '행동치료',
  SPECIAL_PE: '특수체육',
  PLAY: '놀이치료',
  OTHER: '기타',
  DAILY: '일상',
  BEHAVIOR: '힘든 행동',
};

export function sessionTypeLabel(sessionType: string): string {
  return SESSION_TYPE_LABELS[sessionType] ?? sessionType;
}

/** 오늘 하루 기록에서 고르는 수업 종류 */
export const DAILY_SESSION_TYPES = [
  'SPEECH',
  'SPECIAL_PE',
  'SENSORY',
  'ABA',
  'OCCUPATIONAL',
  'PLAY',
  'OTHER',
] as const;
