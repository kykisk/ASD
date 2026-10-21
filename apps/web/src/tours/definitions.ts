import type { TourStep } from './engine';

export type TourId = 'today' | 'curriculum' | 'schedule' | 'growth' | 'research';

const MENU_STEPS: TourStep[] = [
  {
    target: 'nav-main',
    title: '매일 쓰는 메뉴',
    body: '오늘 · 커리큘럼 · 일정 · 성장 · 논문. 가끔 쓰는 메뉴는 아래 "더보기"에 있어요.',
    side: 'right',
  },
  {
    target: 'help-button',
    title: '어느 화면에서든 도움말',
    body: '화면마다 이 버튼을 누르면 그 화면 사용법을 이렇게 안내해 드려요.',
    side: 'bottom',
  },
];

const TOURS: Record<TourId, TourStep[]> = {
  today: [
    {
      target: 'today-activities',
      title: '오늘 집에서 할 활동',
      body: 'AI가 아이 정보와 지난 기록을 보고 매일 아침 만들어 둔 활동이에요. 아직 없으면 "오늘 활동 만들기"를 눌러주세요.',
    },
    {
      target: 'activity-item',
      title: '활동 하나를 눌러보세요 👆',
      body: '누르면 오른쪽에 하는 방법이 나와요.',
      click: {},
    },
    {
      target: 'activity-detail',
      title: '하는 방법',
      body: '준비물과 단계, "이러면 성공이에요"를 보고 아이와 따라 해보세요.',
      side: 'left',
    },
    {
      target: 'activity-results',
      title: '해본 뒤 결과를 눌러요',
      body: '잘했어요 · 조금 했어요 · 못 했어요 중 하나를 누르면 바로 저장되고 다음 활동으로 넘어가요. 한 줄 메모를 남기면 AI가 다음 활동을 만들 때 참고해요.',
      side: 'top',
    },
    {
      target: 'record-button',
      title: '저녁엔 오늘 하루 기록을 해요',
      body: '눌러보세요 👆',
      click: { after: 'record-scores' },
    },
    {
      target: 'record-scores',
      title: '아이가 오늘 어땠나요?',
      body: '5가지 영역을 1(힘들었어요)~5(아주 좋았어요)로 눌러요. 모르는 영역은 비워둬도 돼요.',
      side: 'right',
    },
    {
      target: 'record-extra',
      title: '수업 · 힘든 행동',
      body: '센터 수업이 있었거나 힘든 행동이 있었으면 스위치를 켜고 적어요. 다 적으면 저장하기!',
      side: 'top',
    },
    ...MENU_STEPS,
    {
      title: '내일 아침엔 새 활동이 준비돼요 🌱',
      body: '오늘 기록을 보고 AI가 쉽게 또는 한 단계 높여 활동을 바꿔요. 자세한 설명은 사이드바 아래 "사용 가이드"에 있어요.',
    },
  ],
  curriculum: [
    {
      target: 'curriculum-goal',
      title: '이번 주 목표',
      body: 'AI가 한 주 동안 집중할 목표를 정해요. 매일 활동은 이 목표에 맞춰 만들어져요.',
    },
    {
      target: 'curriculum-activity',
      title: '오늘의 활동',
      body: '카드를 누르면 펼쳐져서 하는 방법·준비물·성공 기준이 보여요. 기록한 활동은 왼쪽에 색 띠가 생겨요.',
    },
    {
      target: 'curriculum-results',
      title: '여기서도 기록할 수 있어요',
      body: '완료 · 부분완료 · 건너뛰기를 고른 뒤 메모를 남기고 저장해요. 오늘 화면에서 기록한 것과 같은 기록이에요.',
    },
    {
      target: 'curriculum-regenerate',
      title: '다시 만들기',
      body: '활동이 아이에게 맞지 않으면 다시 만들 수 있어요. 이미 기록한 날은 기록을 지키기 위해 다시 만들 수 없어요.',
      side: 'bottom',
    },
    {
      target: 'curriculum-history',
      title: '지난 커리큘럼',
      body: '날짜를 골라 지난 활동과 결과를 다시 볼 수 있어요.',
      side: 'left',
    },
  ],
  schedule: [
    {
      target: 'schedule-views',
      title: '보기 바꾸기',
      body: '일간 · 주간 · 월간으로 바꿔 볼 수 있어요.',
      side: 'bottom',
    },
    {
      target: 'schedule-filters',
      title: '종류별로 보기',
      body: '치료 · 교육 · 자유놀이 등 원하는 일정만 골라 볼 수 있어요.',
    },
    {
      target: 'schedule-calendar',
      title: '날짜별 기록 아이콘',
      body: '날짜 칸의 연필 아이콘이 초록색이면 그날 남긴 기록이 있어요. 눌러서 보거나 새로 적을 수 있어요.',
      side: 'top',
    },
    {
      target: 'schedule-add',
      title: '일정 추가',
      body: '센터 수업처럼 반복되는 일정도 한 번에 등록할 수 있어요.',
      side: 'left',
    },
    {
      target: 'schedule-ai',
      title: 'AI 일정 제안',
      body: '아이의 하루 흐름에 맞는 일정을 AI가 제안해 줘요.',
      side: 'bottom',
    },
  ],
  growth: [
    {
      target: 'growth-tabs',
      title: '성장은 세 가지로 봐요',
      body: '변화 그래프 · 기록 모아보기 · AI 주간 요약을 눌러 바꿔 봐요.',
      side: 'bottom',
    },
    {
      target: 'growth-ranges',
      title: '기간 고르기',
      body: '최근 7일 · 30일 · 3개월 중에서 골라요.',
    },
    {
      target: 'growth-day',
      title: '하루 한 장',
      body: '그날의 점수, 메모, 수업 피드백, 힘든 행동, 활동 완료 수를 한눈에 봐요.',
    },
    {
      target: 'growth-edit',
      title: '기록 고치기',
      body: '잘못 적은 수업·일상 기록은 여기서 고치거나 지울 수 있어요.',
      side: 'left',
    },
    {
      title: '변화 그래프 · AI 주간 요약',
      body: '"변화 그래프"에서는 영역별 점수 추이를, "AI 주간 요약"에서는 이번 주 잘한 점과 다음 주에 해볼 것을 볼 수 있어요.',
    },
  ],
  research: [
    {
      target: 'research-tabs',
      title: '논문 보기',
      body: '추천 · 북마크 · 아카이브 · AI 요약 히스토리로 나눠 봐요. 매주 월요일에 새 논문이 들어와요.',
      side: 'bottom',
    },
    {
      target: 'research-article',
      title: '한국어 요약',
      body: '해외 논문을 AI가 한국어 3줄로 요약했어요. 눌러서 핵심 내용을 볼 수 있어요.',
    },
    {
      target: 'research-bookmark',
      title: '북마크',
      body: '도움이 될 것 같은 논문은 북마크해 두세요.',
      side: 'left',
    },
    {
      target: 'research-digest',
      title: '우리 아이 맞춤 요약',
      body: '북마크한 논문을 모아 우리 아이 상황에 맞게 집에서 해볼 것까지 정리해 줘요.',
      side: 'bottom',
    },
  ],
};

/** 현재 주소에 맞는 투어 (없으면 null → 도움말 버튼이 사용 가이드를 엶) */
export function tourForPath(pathname: string): TourId | null {
  if (pathname.startsWith('/today')) return 'today';
  if (pathname.startsWith('/curriculum')) return 'curriculum';
  if (pathname.startsWith('/schedule')) return 'schedule';
  if (pathname.startsWith('/growth')) return 'growth';
  if (pathname.startsWith('/research')) return 'research';
  return null;
}

export function tourSteps(id: TourId): TourStep[] {
  return TOURS[id];
}
