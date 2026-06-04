export const EMERGENCY_GUIDES = {
  MELTDOWN: {
    title: '멜트다운 대응 가이드',
    steps: [
      '안전한 공간으로 이동 — 자극이 적은 조용한 곳으로 아이를 안내하세요',
      '자극 제거 — 소음, 밝은 빛, 사람을 줄여주세요',
      '낮고 차분한 목소리 유지 — 지시는 짧고 간단하게 (1-2단어)',
      '신체 공간 확보 — 아이가 원하지 않으면 접촉하지 마세요',
      '회복 시간 제공 — 완전히 진정될 때까지 기다려주세요',
    ],
    breathingGuide: { inhale: 4, hold: 2, exhale: 6 },
    calmTimerSec: 300,
  },
  SELF_INJURY: {
    title: '자해 행동 대응 가이드',
    steps: [
      '즉각적 안전 확보 — 날카로운 물건 제거, 머리 보호',
      '차분하게 접근 — 크게 반응하지 마세요 (관심 강화 방지)',
      '원인 파악 시도 — 감각 과부하? 요구 좌절? 소통 어려움?',
      '대안 행동 제시 — 안전한 감각 자극 (무거운 담요, 조임 도구)',
      '기록 — 시간, 선행 사건, 지속 시간을 기록하세요',
    ],
    breathingGuide: { inhale: 4, hold: 4, exhale: 4 },
    calmTimerSec: 600,
  },
  AGGRESSION: {
    title: '공격 행동 대응 가이드',
    steps: [
      '본인과 타인 안전 — 거리 유지, 다른 아이들 이동',
      '환경 자극 감소 — 조용하고 단순한 환경 조성',
      '언어적 개입 — 짧고 중립적인 언어 사용',
      '물리적 개입 최소화 — 불가피한 경우에만 부드럽게',
      '진정 후 원인 분석 — 무엇이 공격을 유발했는지 파악',
    ],
    breathingGuide: { inhale: 4, hold: 2, exhale: 8 },
    calmTimerSec: 300,
  },
  ELOPING: {
    title: '도주/탈출 행동 대응 가이드',
    steps: [
      '즉시 따라가기 — 시야에서 놓치지 마세요',
      '차분하게 부르기 — 이름을 반복해서 차분히 부르세요',
      '안전 확인 후 귀환 — 교통, 물, 위험 요소 확인',
      '예방 조치 — 문 잠금장치, 위치 추적 앱 고려',
      '원인 파악 — 어떤 자극이나 불안이 도주를 유발했는지',
    ],
    breathingGuide: { inhale: 4, hold: 0, exhale: 6 },
    calmTimerSec: 0,
  },
  OTHER: {
    title: '일반 위기 상황 대응',
    steps: [
      '우선 안전 확보',
      '차분한 환경 조성',
      '아이의 신호에 귀 기울이기',
      '단계적 개입',
      '기록 및 패턴 분석',
    ],
    breathingGuide: { inhale: 4, hold: 2, exhale: 6 },
    calmTimerSec: 300,
  },
} as const;
