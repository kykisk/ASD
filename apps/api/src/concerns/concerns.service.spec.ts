import { describe, it, expect } from 'vitest';
import {
  buildPattern,
  compareTrial,
  dayNumber,
  matches,
  pubmedQuery,
  titleKeywords,
} from './concerns.service.js';
import { curriculumActivitySchema } from '../ai/schemas/curriculum.schema.js';

const rec = (date: string, extra: Partial<Parameters<typeof buildPattern>[0][number]> = {}) => ({
  id: date,
  date,
  content: '손으로 탁탁 쳤어요',
  behaviorTags: ['상동행동'],
  severity: 2,
  antecedent: null,
  parentResponse: null,
  settled: null,
  ...extra,
});

describe('concerns: 기록 연결 · 패턴 · 시도 비교', () => {
  it('links a behavior record by tag or by keyword in the content', () => {
    const c = { matchTags: ['상동행동'], keywords: ['탁탁'] };
    expect(matches({ behaviorTags: ['상동행동'], content: '' }, c)).toBe(true);
    expect(matches({ behaviorTags: ['기타'], content: '책상을 탁탁 침' }, c)).toBe(true);
    expect(matches({ behaviorTags: ['멜트다운'], content: '마트에서 울음' }, c)).toBe(false);
  });

  it('takes keywords from the title without particles or filler words', () => {
    expect(titleKeywords('손으로 탁탁 치기')).toEqual(['탁탁', '치기']);
    expect(titleKeywords('자꾸 소리를 질러요')).toEqual(['소리', '질러요']);
  });

  it('counts records per week and shows which response settled quickly', () => {
    const today = '2026-10-28';
    const pattern = buildPattern(
      [
        rec('2026-10-27', {
          antecedent: '기다릴 때',
          parentResponse: '같이 따라 했어요',
          settled: 'QUICK',
        }),
        rec('2026-10-26', {
          antecedent: '기다릴 때',
          parentResponse: '다른 걸로 돌렸어요',
          settled: 'LONG',
        }),
        rec('2026-10-20', {
          antecedent: '하던 걸 멈출 때',
          parentResponse: '같이 따라 했어요',
          settled: 'QUICK',
        }),
        rec('2026-08-01'), // 6주보다 오래됨
      ],
      today,
    );
    expect(pattern.total).toBe(3);
    expect(pattern.weeks).toHaveLength(6);
    expect(pattern.weeks[5]).toMatchObject({ start: '2026-10-22', end: '2026-10-28', count: 2 });
    expect(pattern.byAntecedent[0]).toEqual({ label: '기다릴 때', count: 2 });
    expect(pattern.byResponse).toContainEqual({ label: '같이 따라 했어요', count: 2, quick: 2 });
  });

  it('compares the two weeks before a trial with the trial so far, per week', () => {
    const records = [
      ...['2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20'].map(
        (d) => ({ date: d }),
      ),
      { date: '2026-10-23' },
    ];
    // 10/22 시작, 오늘 10/28 → 7일째
    expect(dayNumber('2026-10-22', '2026-10-28')).toBe(7);
    expect(compareTrial(records, '2026-10-22', '2026-11-04', '2026-10-28')).toEqual({
      beforePerWeek: 3,
      duringPerWeek: 1,
      duringDays: 7,
    });
  });

  it('searches papers by the behavior name in the title, skipping odd terms', () => {
    expect(pubmedQuery(['stereotypy', 'repetitive behaviors', '탁탁', 'x'])).toBe(
      '(stereotypy[ti] OR "repetitive behaviors"[ti]) AND (autism[tiab] OR autistic[tiab]) AND (intervention[tiab] OR treatment[tiab] OR parent[tiab]) NOT (drug[ti] OR pharmacological[ti])',
    );
    expect(pubmedQuery([])).toBeNull();
  });

  it('keeps only known activity methods, at most three', () => {
    const parsed = curriculumActivitySchema.parse({
      title: '탁탁 주고받기',
      domain: 'SOCIAL',
      durationMin: 10,
      description: '따라 쳐요',
      steps: ['따라 치기'],
      successCriteria: '두 번 주고받기',
      difficultyLevel: 'EASY',
      methods: ['IMITATE', 'MAGIC', 'WAIT', 'PRAISE', 'MODEL'],
    });
    expect(parsed.methods).toEqual(['IMITATE', 'WAIT', 'PRAISE']);
  });
});
