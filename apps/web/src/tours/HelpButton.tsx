import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { hasSeenTour, runTour } from './engine';
import { tourForPath, tourSteps } from './definitions';

/** 헤더의 도움말: 지금 화면의 따라하기 투어를 보여주고, 투어가 없는 화면은 사용 가이드를 연다 */
export function HelpButton() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const tourId = tourForPath(pathname);
  const [unseen, setUnseen] = useState(false);

  useEffect(() => {
    const update = () => setUnseen(!!tourId && !hasSeenTour(tourId));
    update();
    window.addEventListener('auticare-tour-seen', update);
    return () => window.removeEventListener('auticare-tour-seen', update);
  }, [tourId]);

  return (
    <button
      type="button"
      data-tour="help-button"
      onClick={() => (tourId ? runTour(tourId, tourSteps(tourId)) : navigate('/guide'))}
      className="relative h-9 px-3 rounded-full border border-neutral-200 bg-white text-sm text-neutral-700 hover:border-primary-300 hover:text-primary-700 flex items-center gap-1.5"
      aria-label={tourId ? '이 화면 도움말' : '사용 가이드'}
    >
      <span
        className="w-5 h-5 rounded-full bg-primary-50 text-primary-700 text-xs font-bold flex items-center justify-center"
        aria-hidden="true"
      >
        ?
      </span>
      <span className="hidden sm:inline">도움말</span>
      {unseen && (
        <span
          className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#E8A87C] ring-2 ring-white"
          aria-hidden="true"
        />
      )}
    </button>
  );
}
