import type { TourId, TourStep } from './tour.js';

/** 화면별 따라하기 투어. 화면에 없는 대상은 실행할 때 건너뜀 */
export const TOUR_STEPS: Record<TourId, TourStep[]> = {
  today: [
    {
      target: 'tour-activities',
      title: '오늘 집에서 할 활동',
      body: 'AI가 아이 정보와 지난 기록을 보고 매일 아침 만들어 둔 활동이에요. 아직 없으면 "오늘 활동 만들기"를 눌러주세요.',
    },
    {
      target: 'tour-activity-0',
      title: '활동 하나를 눌러보세요 👆',
      body: '누르면 하는 방법이 나와요.',
      next: 'activity',
    },
    {
      target: 'tour-record',
      title: '저녁엔 오늘 하루 기록',
      body: '아이 상태, 있었던 일, 센터 수업 내용을 한 번에 적어요.',
    },
  ],
  curriculum: [
    {
      target: 'tour-cur-toggle',
      title: '오늘 · 지난 기록',
      body: '오늘 커리큘럼과 지난 커리큘럼을 바꿔 볼 수 있어요.',
    },
    {
      target: 'tour-cur-goal',
      title: '이번 주 목표',
      body: 'AI가 한 주 동안 집중할 목표를 정해요. 매일 활동은 이 목표에 맞춰 만들어져요.',
    },
    {
      target: 'tour-cur-activity',
      title: '오늘의 활동',
      body: '카드를 누르면 펼쳐져서 하는 방법·준비물·성공 기준이 보여요.',
    },
    {
      target: 'tour-cur-results',
      title: '여기서도 기록할 수 있어요',
      body: '성공 · 부분 · 건너뜀을 누르면 저장돼요. 오늘 화면에서 기록한 것과 같은 기록이에요.',
    },
  ],
  schedule: [
    {
      target: 'tour-sch-week',
      title: '이번 주 일정',
      body: '날짜를 누르면 그날 일정이 아래에 보여요. 지난 수업에는 "피드백" 버튼으로 선생님 말씀을 적을 수 있어요.',
    },
    {
      target: 'tour-sch-add',
      title: '일정 추가',
      body: '센터 수업처럼 반복되는 일정도 한 번에 등록할 수 있어요.',
    },
  ],
  growth: [
    {
      target: 'tour-growth-tabs',
      title: '성장은 세 가지로 봐요',
      body: '변화 그래프 · 기록 모아보기 · AI 주간 요약을 눌러 바꿔 봐요.',
    },
    {
      target: 'tour-growth-ranges',
      title: '기간 고르기',
      body: '최근 7일 · 30일 · 3개월 중에서 골라요.',
    },
    {
      target: 'tour-growth-day',
      title: '하루 한 장',
      body: '그날의 점수, 메모, 수업 피드백, 힘든 행동, 활동 완료 수를 한눈에 봐요.',
    },
    {
      title: '변화 그래프 · AI 주간 요약',
      body: '"변화"에서는 영역별 점수 추이를, "AI 주간 요약"에서는 이번 주 잘한 점과 다음 주에 해볼 것을 볼 수 있어요.',
    },
  ],
  papers: [
    {
      target: 'tour-paper-tabs',
      title: '논문 보기',
      body: '추천 · 북마크 · AI 요약으로 나눠 봐요. 매주 월요일에 새 논문이 들어와요.',
    },
    {
      target: 'tour-paper-article',
      title: '한국어 요약',
      body: '해외 논문을 AI가 한국어로 요약했어요. 눌러서 핵심 내용을 볼 수 있어요.',
    },
    {
      target: 'tour-paper-bookmark',
      title: '북마크',
      body: '도움이 될 것 같은 논문은 북마크해 두세요.',
    },
    {
      target: 'tour-paper-digest',
      title: '우리 아이 맞춤 요약',
      body: '북마크한 논문을 모아 우리 아이 상황에 맞게 집에서 해볼 것까지 정리해 줘요.',
    },
  ],
};

/** 탭 주소 → 투어 */
export function tourForPath(pathname: string): TourId | null {
  if (pathname === '/' || pathname === '/index') return 'today';
  if (pathname.startsWith('/curriculum')) return 'curriculum';
  if (pathname.startsWith('/schedule')) return 'schedule';
  if (pathname.startsWith('/growth')) return 'growth';
  if (pathname.startsWith('/papers')) return 'papers';
  return null;
}
