import { z } from 'zod';

// AI 출력이 상한을 넘겨도 예외 대신 잘라내 커리큘럼 생성 전체 실패를 막는다 (하드 max() 금지)
const cappedString = (max: number) =>
  z.string().transform((s) => (s.length > max ? s.slice(0, max) : s));

/**
 * 활동에 쓰인 방법 (근거 기반 중재 중 가정에서 쓸 수 있는 것). 키 → 화면 이름은 웹 · 모바일에 있음
 * 관점: DEVELOPMENTAL(발달 · 놀이 중심) · BEHAVIORAL(행동주의) · SENSORY(감각통합) · COMMON(공통)
 */
export const ACTIVITY_METHODS = {
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
} as const;

const METHOD_KEYS = Object.keys(ACTIVITY_METHODS);

export const curriculumActivitySchema = z.object({
  title: z
    .string()
    .min(1)
    .transform((s) => (s.length > 100 ? s.slice(0, 100) : s)),
  domain: z.enum(['COMMUNICATION', 'SOCIAL', 'MOTOR', 'COGNITIVE', 'EMOTIONAL', 'DAILY_LIVING']),
  durationMin: z.number().int().min(5).max(120),
  description: cappedString(500),
  materials: z.array(z.string()).optional(),
  steps: z.array(z.string()).min(1).max(10),
  successCriteria: cappedString(300),
  difficultyLevel: z.enum(['EASY', 'MEDIUM', 'HARD']),
  /** 왜 이 활동? 어떤 기록을 보고 만들었는지 */
  rationale: cappedString(200).optional(),
  /** 쓰인 방법 (ACTIVITY_METHODS 키, 최대 3개). 모르는 키는 버림 */
  methods: z
    .array(z.string())
    .optional()
    .transform((arr) => (arr ?? []).filter((m) => METHOD_KEYS.includes(m)).slice(0, 3)),
  /** 안전 · 주의할 점 */
  caution: cappedString(150).nullable().optional(),
  /** 지금 시도 중인 방법을 연습하는 활동이면 true (서버가 고민 id 를 붙임) */
  forTrial: z.boolean().optional(),
  concernId: z.string().optional(),
});

export const curriculumOutputSchema = z.object({
  weeklyGoal: cappedString(300),
  activities: z.array(curriculumActivitySchema).min(1).max(5),
  notes: cappedString(500).optional(),
});

export type CurriculumOutput = z.infer<typeof curriculumOutputSchema>;
export type CurriculumActivity = z.infer<typeof curriculumActivitySchema>;
