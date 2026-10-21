/** AI 기능 키 → 화면 이름 · 어디서 쓰이는지 · 추천 등급 */
export const AI_FEATURES: Record<
  string,
  { name: string; where: string; tier: 'QUALITY' | 'FAST' }
> = {
  CURRICULUM: { name: '커리큘럼 만들기', where: '매일 04:00 · 오늘 활동 만들기', tier: 'QUALITY' },
  FEEDBACK_DOMAIN_EXTRACTION: {
    name: '기록에서 점수 뽑기',
    where: '오늘 하루 기록 · 수업 피드백 저장할 때',
    tier: 'FAST',
  },
  INSIGHT: { name: '이번 주 요약', where: '오늘 화면 · 성장 › AI 주간 요약', tier: 'QUALITY' },
  FEEDBACK_DIGEST: { name: '주간 기록 요약', where: '일요일 21:00 · 직접 만들기', tier: 'FAST' },
  RESEARCH_SUMMARIZE: {
    name: '논문 한국어 요약',
    where: '월요일 08:00 수집 · 재처리',
    tier: 'FAST',
  },
  RESEARCH_DIGEST: { name: '우리 아이 맞춤 논문 요약', where: '논문 › 맞춤 요약', tier: 'QUALITY' },
  IMAGE_QUESTIONNAIRE: { name: '사진 → 질문지', where: '질문지 사진 업로드', tier: 'QUALITY' },
  CLINICAL_REPORT_IMPORT: {
    name: '사진 → 임상 보고서',
    where: '임상 평가 › 외부 보고서',
    tier: 'QUALITY',
  },
  WELLBEING: { name: '마음 체크인 격려', where: '부모님을 위해 › 마음 체크인', tier: 'FAST' },
  EMERGENCY: { name: '힘든 순간 패턴 분석', where: '부모님을 위해 › 힘든 순간', tier: 'QUALITY' },
  SENSORY: { name: '감각 활동 추천', where: '감각 특성', tier: 'FAST' },
  SCHEDULE_SUGGEST: { name: '일정 제안', where: '일정', tier: 'FAST' },
  QUESTIONNAIRE_GENERATE: { name: '질문지 만들기', where: '질문지', tier: 'FAST' },
  QUESTIONNAIRE_FILTER: { name: '질문지 저작권 확인', where: '질문지', tier: 'QUALITY' },
};

export const featureName = (key: string) => AI_FEATURES[key]?.name ?? key;

/** 모델 ID → 짧은 이름 (claude-sonnet-5-5 → Sonnet 5.5) */
export function modelShortName(modelId: string | null | undefined): string {
  if (!modelId) return '-';
  const m = modelId.match(/(opus|sonnet|haiku|fable)-(\d+)(?:-(\d+))?/i);
  if (!m) return modelId;
  const family = m[1][0].toUpperCase() + m[1].slice(1).toLowerCase();
  return m[3] && m[3].length <= 2 ? `${family} ${m[2]}.${m[3]}` : `${family} ${m[2]}`;
}

export const BATCH_STATUS: Record<string, { label: string; color: string }> = {
  COMPLETED: { label: '성공', color: 'success' },
  PARTIAL: { label: '일부 실패', color: 'warning' },
  FAILED: { label: '실패', color: 'error' },
  RUNNING: { label: '실행 중', color: 'processing' },
  PENDING: { label: '대기', color: 'default' },
};

/** 완료됐지만 실패 항목이 있으면 '일부 실패' */
export function batchStatusKey(run: { status: string; failedItems: number }): string {
  return run.status === 'COMPLETED' && run.failedItems > 0 ? 'PARTIAL' : run.status;
}

const KST = 'Asia/Seoul';

/** 10/21 04:00 (한국 시간) */
export function kstShort(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: KST,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('month')}/${get('day')} ${get('hour')}:${get('minute')}`;
}

export function kstDateTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('ko-KR', { timeZone: KST, hour12: false });
}

/** 걸린 시간: 2분 14초 */
export function duration(start: string | null, end: string | null): string {
  if (!start || !end) return '';
  const s = Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000));
  if (s < 60) return `${s}초`;
  return `${Math.floor(s / 60)}분 ${s % 60}초`;
}

/** 배치 errors(Json) 에서 첫 오류 문구 */
export function firstError(errors: unknown): string {
  if (Array.isArray(errors) && errors.length > 0) {
    const e = errors[0];
    return typeof e === 'string' ? e : JSON.stringify(e);
  }
  return '';
}
