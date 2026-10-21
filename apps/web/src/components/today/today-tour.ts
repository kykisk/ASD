import { driver, type DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';
import './today-tour.css';

const SEEN_KEY = 'auticare-tour-today-v1';

export function hasSeenTodayTour(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return true;
  }
}

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* 저장 못 해도 투어는 다시 볼 수 있으면 됨 */
  }
}

const sel = (name: string) => `[data-tour="${name}"]`;

/** 대상 요소가 나타날 때까지 기다림 (모달처럼 클릭 뒤에 생기는 요소) */
function waitFor(selector: string, timeoutMs = 3000): Promise<void> {
  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      if (document.querySelector(selector) || Date.now() - started > timeoutMs) resolve();
      else window.setTimeout(tick, 50);
    };
    tick();
  });
}

/**
 * '오늘' 화면 따라하기 투어. "눌러보세요" 단계는 실제로 그 요소를 눌러야 다음으로 넘어간다.
 * hasActivities 가 false 면 활동 관련 단계를 빼고 활동 만들기부터 안내한다.
 */
export function startTodayTour({ hasActivities }: { hasActivities: boolean }) {
  // 실제 클릭으로 넘어가는 단계: 대상 요소를 누르면 다음 단계로
  const clickToContinue = (
    target: string,
    after?: string,
  ): Pick<DriveStep, 'onHighlighted' | 'onDeselected'> => {
    let cleanup: (() => void) | null = null;
    return {
      onHighlighted: (element) => {
        if (!element) return;
        const handler = async () => {
          if (after) await waitFor(after);
          tour.moveNext();
        };
        element.addEventListener('click', handler, { once: true });
        cleanup = () => element.removeEventListener('click', handler);
      },
      onDeselected: () => {
        cleanup?.();
        cleanup = null;
      },
    };
  };

  const steps: DriveStep[] = hasActivities
    ? [
        {
          element: sel('today-activities'),
          popover: {
            title: '오늘 집에서 할 활동',
            description: 'AI가 아이 정보와 지난 기록을 보고 매일 아침 만들어 둔 활동이에요.',
          },
        },
        {
          element: sel('activity-item'),
          popover: {
            title: '활동 하나를 눌러보세요 👆',
            description: '누르면 오른쪽에 하는 방법이 나와요.',
            showButtons: ['close'],
          },
          ...clickToContinue(sel('activity-item')),
        },
        {
          element: sel('activity-detail'),
          popover: {
            title: '하는 방법',
            description: '준비물과 단계, "이러면 성공이에요"를 보고 아이와 따라 해보세요.',
            side: 'left',
          },
        },
        {
          element: sel('activity-results'),
          popover: {
            title: '해본 뒤 결과를 눌러요',
            description:
              '잘했어요 · 조금 했어요 · 못 했어요 중 하나를 누르면 바로 저장되고 다음 활동으로 넘어가요. 한 줄 메모를 남기면 AI가 다음 활동을 만들 때 참고해요.',
            side: 'top',
          },
        },
        {
          element: sel('record-button'),
          popover: {
            title: '저녁엔 오늘 하루 기록을 해요',
            description: '눌러보세요 👆',
            showButtons: ['close'],
          },
          ...clickToContinue(sel('record-button'), sel('record-scores')),
        },
        {
          element: sel('record-scores'),
          popover: {
            title: '아이가 오늘 어땠나요?',
            description:
              '5가지 영역을 1(힘들었어요)~5(아주 좋았어요)로 눌러요. 모르는 영역은 비워둬도 돼요.',
            side: 'right',
          },
        },
        {
          element: sel('record-extra'),
          popover: {
            title: '수업 · 힘든 행동',
            description:
              '센터 수업이 있었거나 힘든 행동이 있었으면 스위치를 켜고 적어요. 다 적으면 저장하기!',
            side: 'top',
          },
        },
        {
          popover: {
            title: '내일 아침엔 새 활동이 준비돼요 🌱',
            description:
              '오늘 기록을 보고 AI가 쉽게 또는 한 단계 높여 활동을 바꿔요. 다시 보고 싶으면 위의 "도움말"을, 자세한 설명은 "사용 가이드"를 눌러주세요.',
          },
        },
      ]
    : [
        {
          element: sel('today-activities'),
          popover: {
            title: '오늘 집에서 할 활동',
            description:
              '"오늘 활동 만들기"를 누르면 아이 정보를 보고 30초 정도 뒤에 활동이 만들어져요. 만든 뒤 도움말을 다시 누르면 기록하는 방법까지 알려드려요.',
          },
        },
        {
          element: sel('record-button'),
          popover: {
            title: '저녁엔 오늘 하루 기록',
            description: '아이 상태, 있었던 일, 센터 수업 내용을 한 번에 적어요.',
          },
        },
      ];

  const tour = driver({
    steps,
    showProgress: true,
    progressText: '{{current}} / {{total}}',
    nextBtnText: '다음',
    prevBtnText: '이전',
    doneBtnText: '시작하기',
    allowClose: true,
    overlayOpacity: 0.55,
    stagePadding: 6,
    stageRadius: 14,
    popoverClass: 'auticare-tour',
    onDestroyed: markSeen,
  });
  tour.drive();
}
