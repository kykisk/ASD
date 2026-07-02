import { curriculumActivitySchema, curriculumOutputSchema } from './curriculum.schema';

const validActivity = {
  title: '블록 쌓기 놀이',
  domain: 'MOTOR',
  durationMin: 20,
  description: '아이와 함께 블록을 쌓으며 소근육을 발달시킵니다.',
  materials: ['블록'],
  steps: ['블록을 준비한다', '하나씩 쌓는다', '완성하면 칭찬한다'],
  successCriteria: '블록 3개 이상 쌓기',
  difficultyLevel: 'EASY',
};

describe('curriculumOutputSchema', () => {
  it('parses a valid curriculum', () => {
    const result = curriculumOutputSchema.parse({
      weeklyGoal: '이번 주 소근육 발달',
      activities: [validActivity],
      notes: '아이가 피곤할 때는 쉬어주세요',
    });

    expect(result.weeklyGoal).toBe('이번 주 소근육 발달');
    expect(result.activities).toHaveLength(1);
    expect(result.notes).toBe('아이가 피곤할 때는 쉬어주세요');
  });

  it('truncates notes over 500 chars instead of throwing (regression: AIService too_big on notes)', () => {
    const result = curriculumOutputSchema.parse({
      weeklyGoal: '목표',
      activities: [validActivity],
      notes: 'a'.repeat(800),
    });

    expect(result.notes).toHaveLength(500);
  });

  it('truncates weeklyGoal over 300 chars', () => {
    const result = curriculumOutputSchema.parse({
      weeklyGoal: 'b'.repeat(500),
      activities: [validActivity],
    });

    expect(result.weeklyGoal).toHaveLength(300);
  });

  it('allows notes to be omitted', () => {
    const result = curriculumOutputSchema.parse({
      weeklyGoal: '목표',
      activities: [validActivity],
    });

    expect(result.notes).toBeUndefined();
  });
});

describe('curriculumActivitySchema', () => {
  it('truncates description (500) and successCriteria (300) instead of throwing', () => {
    const result = curriculumActivitySchema.parse({
      ...validActivity,
      description: 'x'.repeat(900),
      successCriteria: 'y'.repeat(600),
    });

    expect(result.description).toHaveLength(500);
    expect(result.successCriteria).toHaveLength(300);
  });

  it('truncates title over 100 chars', () => {
    const result = curriculumActivitySchema.parse({
      ...validActivity,
      title: 'z'.repeat(200),
    });

    expect(result.title).toHaveLength(100);
  });

  it('rejects an empty title (min length preserved)', () => {
    expect(() => curriculumActivitySchema.parse({ ...validActivity, title: '' })).toThrow();
  });
});
