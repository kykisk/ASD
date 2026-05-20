import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CalendarViewMode } from '../../types/schedule';

interface CalendarHeaderProps {
  currentDate: Date;
  viewMode: CalendarViewMode;
  onViewModeChange: (mode: CalendarViewMode) => void;
  onNavigate: (direction: 'prev' | 'next' | 'today') => void;
}

const VIEW_LABELS: Record<CalendarViewMode, string> = {
  day: '일간',
  week: '주간',
  month: '월간',
};

function getDateLabel(date: Date, mode: CalendarViewMode): string {
  switch (mode) {
    case 'month':
      return format(date, 'yyyy년 M월', { locale: ko });
    case 'week':
      return format(date, 'yyyy년 M월 d일 주간', { locale: ko });
    case 'day':
      return format(date, 'yyyy년 M월 d일 (EEEE)', { locale: ko });
  }
}

export function CalendarHeader({
  currentDate,
  viewMode,
  onViewModeChange,
  onNavigate,
}: CalendarHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold text-neutral-800">
          {getDateLabel(currentDate, viewMode)}
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onNavigate('prev')}
            className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <button
            onClick={() => onNavigate('today')}
            className="px-2.5 py-1 text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-md transition-colors"
          >
            오늘
          </button>
          <button
            onClick={() => onNavigate('next')}
            className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-lg">
        {(Object.keys(VIEW_LABELS) as CalendarViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => onViewModeChange(mode)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              viewMode === mode
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {VIEW_LABELS[mode]}
          </button>
        ))}
      </div>
    </div>
  );
}
