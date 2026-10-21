import { driver, type DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';
import './tour.css';

export interface TourStep {
  /** data-tour 이름. 없으면 화면 가운데 안내 */
  target?: string;
  title: string;
  body: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** 대상을 실제로 눌러야 다음으로 넘어감. after 가 있으면 그 요소가 나타날 때까지 기다림 */
  click?: { after?: string };
}

const seenKey = (id: string) => `auticare-tour-${id}-v1`;

export function hasSeenTour(id: string): boolean {
  try {
    return localStorage.getItem(seenKey(id)) === '1';
  } catch {
    return true;
  }
}

function markSeen(id: string) {
  try {
    localStorage.setItem(seenKey(id), '1');
  } catch {
    /* 저장 못 해도 도움말로 다시 볼 수 있음 */
  }
  window.dispatchEvent(new Event('auticare-tour-seen'));
}

const sel = (name: string) => `[data-tour="${name}"]`;

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
 * 따라하기 투어 실행. 화면에 없는 대상(데이터가 없어 안 그려진 카드 등)을 가리키는 단계는 건너뛴다.
 * click 단계는 다음 버튼 없이 대상을 실제로 눌러야 넘어간다.
 */
export function runTour(id: string, steps: TourStep[]) {
  const visible = steps.filter((s) => !s.target || document.querySelector(sel(s.target)));
  if (visible.length === 0) return;

  const driveSteps: DriveStep[] = visible.map((step) => {
    const driveStep: DriveStep = {
      element: step.target ? sel(step.target) : undefined,
      popover: {
        title: step.title,
        description: step.body,
        side: step.side,
        ...(step.click ? { showButtons: ['close' as const] } : {}),
      },
    };
    if (step.click) {
      let cleanup: (() => void) | null = null;
      driveStep.onHighlighted = (element) => {
        if (!element) return;
        const handler = async () => {
          if (step.click?.after) await waitFor(sel(step.click.after));
          tour.moveNext();
        };
        element.addEventListener('click', handler, { once: true });
        cleanup = () => element.removeEventListener('click', handler);
      };
      driveStep.onDeselected = () => {
        cleanup?.();
        cleanup = null;
      };
    }
    return driveStep;
  });

  const tour = driver({
    steps: driveSteps,
    showProgress: driveSteps.length > 1,
    progressText: '{{current}} / {{total}}',
    nextBtnText: '다음',
    prevBtnText: '이전',
    doneBtnText: '확인',
    overlayOpacity: 0.55,
    stagePadding: 6,
    stageRadius: 14,
    popoverClass: 'auticare-tour',
    onDestroyed: () => markSeen(id),
  });
  tour.drive();
}
