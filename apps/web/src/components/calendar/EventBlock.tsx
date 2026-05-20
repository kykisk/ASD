import { format } from 'date-fns';
import {
  Schedule,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
} from '../../types/schedule';

interface EventBlockProps {
  schedule: Schedule;
  compact?: boolean;
  onClick?: (schedule: Schedule) => void;
}

export function EventBlock({ schedule, compact = false, onClick }: EventBlockProps) {
  const colors = CATEGORY_COLORS[schedule.category];
  const timeLabel = schedule.isAllDay
    ? '종일'
    : `${format(new Date(schedule.startTime), 'HH:mm')}`;

  if (compact) {
    return (
      <button
        onClick={() => onClick?.(schedule)}
        className={`w-full text-left px-1.5 py-0.5 rounded text-[11px] font-medium truncate border-l-2 ${colors.bg} ${colors.text} ${colors.border} hover:opacity-80 transition-opacity`}
      >
        {schedule.title}
      </button>
    );
  }

  return (
    <button
      onClick={() => onClick?.(schedule)}
      className={`w-full text-left px-2 py-1.5 rounded-md border-l-[3px] ${colors.bg} ${colors.border} hover:shadow-sm transition-shadow group`}
    >
      <div className="flex items-center gap-1.5">
        <span className={`text-[11px] font-medium ${colors.text} opacity-75`}>
          {timeLabel}
        </span>
        <span className={`text-[10px] px-1 py-0.5 rounded ${colors.bg} ${colors.text} opacity-60`}>
          {CATEGORY_LABELS[schedule.category]}
        </span>
      </div>
      <p className={`text-xs font-medium ${colors.text} truncate mt-0.5`}>
        {schedule.title}
      </p>
      {schedule.description && !compact && (
        <p className="text-[11px] text-neutral-500 truncate mt-0.5 hidden group-hover:block">
          {schedule.description}
        </p>
      )}
    </button>
  );
}
