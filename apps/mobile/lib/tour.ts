// 따라하기 투어는 웹(브라우저)에서만 동작. 네이티브 앱에서는 도움말 버튼이 사용 가이드를 연다 (tour.web.ts 참고)
export type TourPart = 'today' | 'activity' | 'today-record' | 'record';

export type TourId = 'today' | 'curriculum' | 'schedule' | 'growth' | 'papers';

export interface TourStep {
  /** nativeID (웹에서는 요소 id). 없으면 화면 가운데 안내. 화면에 없으면 그 단계는 건너뜀 */
  target?: string;
  title: string;
  body: string;
  /** 있으면 그 요소를 실제로 눌러야 다음으로 넘어가고, 이동한 화면에서 이 부분부터 이어서 보여줌 */
  next?: TourPart;
}

export const tourSupported = false;

export function hasSeenTour(_id: TourId = 'today'): boolean {
  return true;
}

export function markTourSeen(_id: TourId = 'today'): void {}

export function setPendingTour(_part: TourPart | null): void {}

export function takePendingTour(_part: TourPart): boolean {
  return false;
}

export function runTour(
  _steps: TourStep[],
  _options: { id?: TourId; onComplete?: () => void } = {},
): void {}
