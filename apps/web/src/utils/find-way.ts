/** 맞는 방법 찾기 · 활동 근거 화면 이름 (서버 키 → 한글) */

export const METHOD_LABELS: Record<string, { label: string; approach: string }> = {
  FOLLOW_LEAD: { label: '아이 주도 따르기', approach: 'DEVELOPMENTAL' },
  IMITATE: { label: '따라 하기 (모방)', approach: 'DEVELOPMENTAL' },
  WAIT: { label: '기다려 주기', approach: 'DEVELOPMENTAL' },
  ROUTINE: { label: '일상 속에 끼워 넣기', approach: 'DEVELOPMENTAL' },
  TASK_STEPS: { label: '단계 나누기', approach: 'BEHAVIORAL' },
  PROMPT_FADE: { label: '도움 줄여 가기', approach: 'BEHAVIORAL' },
  PRAISE: { label: '바로 칭찬하기', approach: 'BEHAVIORAL' },
  MODEL: { label: '시범 보이기', approach: 'COMMON' },
  VISUAL: { label: '그림 · 순서표', approach: 'COMMON' },
  CHOICE: { label: '선택권 주기', approach: 'COMMON' },
  PREVIEW: { label: '미리 알려주기', approach: 'COMMON' },
  SENSORY_INPUT: { label: '감각 채워 주기', approach: 'SENSORY' },
};

export const APPROACH_LABELS: Record<string, string> = {
  BEHAVIORAL: '행동주의 (ABA)',
  DEVELOPMENTAL: '발달 · 놀이 중심',
  SENSORY: '감각통합 (작업치료)',
  NEURODIVERSITY: '신경다양성 관점',
  CENTER: '센터 선생님 방법',
  COMMON: '여러 관점 공통',
  OTHER: '기타',
};

export const EVIDENCE_LABELS: Record<string, { label: string; strong: boolean }> = {
  STRONG: { label: '연구 많음', strong: true },
  MODERATE: { label: '연구 있음', strong: true },
  EMERGING: { label: '연구 초기', strong: false },
  VIEWPOINT: { label: '관점', strong: false },
};

/** 힘든 행동 바로 전 상황 (서버 ANTECEDENT_OPTIONS 와 같음) */
export const ANTECEDENT_OPTIONS = [
  '기다릴 때',
  '하던 걸 멈출 때',
  '심심할 때',
  '시끄럽거나 복잡할 때',
  '원하는 걸 못 가질 때',
  '해야 할 걸 줬을 때',
  '피곤하거나 졸릴 때',
  '잘 모르겠어요',
];

export const RESPONSE_OPTIONS = [
  '말렸어요',
  '다른 걸로 돌렸어요',
  '같이 따라 했어요',
  '그냥 뒀어요',
  '원하는 걸 줬어요',
  '안아주며 진정시켰어요',
];

export const SETTLED_OPTIONS: Array<{ key: 'QUICK' | 'SOME' | 'LONG'; label: string }> = [
  { key: 'QUICK', label: '금방 멈췄어요' },
  { key: 'SOME', label: '조금 걸렸어요' },
  { key: 'LONG', label: '오래 걸렸어요' },
];

export const RATING_OPTIONS: Array<{ key: 'GOOD' | 'SO_SO' | 'NOT_GOOD'; label: string }> = [
  { key: 'GOOD', label: '잘 맞았어요' },
  { key: 'SO_SO', label: '그저 그래요' },
  { key: 'NOT_GOOD', label: '안 맞았어요' },
];
