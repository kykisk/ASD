import { driver, type DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';
import './tour.css';
import type { TourId, TourPart, TourStep } from './tour.js';

export type { TourId, TourPart, TourStep } from './tour.js';

const seenKey = (id: TourId) => `auticare-tour-${id}-v1`;

export const tourSupported = true;

export function hasSeenTour(id: TourId = 'today'): boolean {
  try {
    return localStorage.getItem(seenKey(id)) === '1';
  } catch {
    return true;
  }
}

export function markTourSeen(id: TourId = 'today'): void {
  try {
    localStorage.setItem(seenKey(id), '1');
  } catch {
    /* 저장 못 해도 도움말로 다시 볼 수 있음 */
  }
  window.dispatchEvent(new Event('auticare-tour-seen'));
}

// 화면을 넘어가며 이어지는 투어: 다음 화면이 열리면 이어서 보여줄 부분
let pending: TourPart | null = null;

export function setPendingTour(part: TourPart | null): void {
  pending = part;
}

export function takePendingTour(part: TourPart): boolean {
  if (pending !== part) return false;
  pending = null;
  return true;
}

/**
 * 투어 실행. next 가 있는 단계는 대상을 실제로 눌러야 하고, 누르면 투어를 닫고 이동한 화면에서 이어간다.
 * 끝까지 본 경우에만 onComplete 를 부른다 (중간에 닫으면 이어지는 투어도 멈춤).
 */
export function runTour(
  steps: TourStep[],
  { id = 'today', onComplete }: { id?: TourId; onComplete?: () => void } = {},
): void {
  let movedByClick = false;
  let completed = false;

  // 데이터가 없어 화면에 안 그려진 대상은 건너뜀
  const visible = steps.filter((step) => !step.target || document.getElementById(step.target));
  if (visible.length === 0) return;

  const driveSteps: DriveStep[] = visible.map((step) => ({
    element: step.target ? `#${step.target}` : undefined,
    popover: {
      title: step.title,
      description: step.body,
      ...(step.next ? { showButtons: ['close' as const] } : {}),
    },
    ...(step.next
      ? {
          onHighlighted: (element?: Element) => {
            // 화면 이동이 눌림 처리보다 먼저 일어날 수 있어 미리 다음 부분을 걸어둠
            setPendingTour(step.next ?? null);
            element?.addEventListener(
              'click',
              () => {
                movedByClick = true;
                tour.destroy();
              },
              { once: true },
            );
          },
        }
      : {}),
  }));

  const tour = driver({
    steps: driveSteps,
    showProgress: visible.length > 1,
    progressText: '{{current}} / {{total}}',
    nextBtnText: '다음',
    prevBtnText: '이전',
    doneBtnText: '확인',
    overlayOpacity: 0.55,
    stagePadding: 6,
    stageRadius: 14,
    popoverClass: 'auticare-tour',
    onDestroyStarted: () => {
      completed = !tour.hasNextStep();
      tour.destroy();
    },
    onDestroyed: () => {
      if (movedByClick) return;
      pending = null;
      markTourSeen(id);
      if (completed) onComplete?.();
    },
  });
  tour.drive();
}
