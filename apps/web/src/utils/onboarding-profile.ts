/** 첫 사용 안내에서 고른 항목 → 아이 프로필 (센터 정보·발달 메모). 커리큘럼 AI 가 그대로 참고한다 */
export const CENTER_OPTIONS = [
  '언어치료',
  '특수체육',
  '감각통합',
  'ABA',
  '놀이치료',
  '작업치료',
] as const;
export const CONCERN_OPTIONS = [
  '말이 늘었으면',
  '눈맞춤 · 상호작용',
  '배변 훈련',
  '떼쓰기 · 힘든 행동',
  '손 사용 · 소근육',
  '잠 · 식사',
] as const;
export const DIAGNOSIS_OPTIONS = ['자폐 스펙트럼', '발달 지연', '평가 중이에요'] as const;

export function buildOnboardingProfile(input: {
  centers: string[];
  concerns: string[];
  likes: string;
}) {
  const overall = [
    input.concerns.length > 0 ? `부모가 요즘 가장 신경 쓰는 것: ${input.concerns.join(', ')}` : '',
    input.likes.trim() ? `아이가 좋아하는 것(활동에 활용): ${input.likes.trim()}` : '',
  ]
    .filter(Boolean)
    .join('. ')
    .slice(0, 500);
  return {
    centerInfo: input.centers.map((type) => ({ name: type, type, frequency: '' })),
    developmentalLevel: overall ? { overall } : undefined,
  };
}
