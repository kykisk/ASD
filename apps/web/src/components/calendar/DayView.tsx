import {
  format,
  isToday,
  differenceInMinutes,
  startOfDay,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { Schedule, CATEGORY_COLORS } from '../../types/schedule';
import { EventBlock } from './EventBlock';

interface DayViewProps {
  currentDate: Date;
  schedules: Schedule[];
  onEventClick?: (schedule: Schedule) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 56;

export function DayView({ currentDate, schedules, onEventClick }: DayViewProps) {
  const daySchedules = schedules.filter((s) => {
    const eventDate = format(new Date(s.startTime), 'yyyy-MM-dd');
    const currentDateStr = format(currentDate, 'yyyy-MM-dd');
    return eventDate === currentDateStr;
  });

  const allDayEvents = daySchedules.filter((s) => s.isAllDay);
  const timedEvents = daySchedules.filter((s) => !s.isAllDay);
  const today = isToday(currentDate);

  function getEventPosition(schedule: Schedule) {
    const start = new Date(schedule.startTime);
    const end = new Date(schedule.endTime);
    const dayStart = startOfDay(start);
    const topMinutes = differenceInMinutes(start, dayStart);
    const durationMinutes = differenceInMinutes(end, start);
    const top = (topMinutes / 60) * HOUR_HEIGHT;
    const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, 28);
    return { top, height };
  }

  return (
    <div className="border border-neutral-200 rounded-lg overflow-hidden bg-white">
      <div className={`px-4 py-3 border-b border-neutral-200 ${today ? 'bg-primary-50/30' : 'bg-neutral-50'}`}>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-lg font-bold ${
              today
                ? 'bg-primary-500 text-white'
                : 'bg-neutral-100 text-neutral-700'
            }`}
          >
            {format(currentDate, 'd')}
          </span>
          <div>
            <p className="text-sm font-semibold text-neutral-800">
              {format(currentDate, 'EEEE', { locale: ko })}
            </p>
            <p className="text-xs text-neutral-500">
              {format(currentDate, 'yyyy년 M월 d일')}
            </p>
          </div>
        </div>
      </div>

      {allDayEvents.length > 0 && (
        <div className="px-4 py-2 border-b border-neutral-200 bg-neutral-50/50 space-y-1">
          <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">
            종일 일정
          </p>
          {allDayEvents.map((event) => (
            <EventBlock
              key={event.id}
              schedule={event}
              onClick={onEventClick}
            />
          ))}
        </div>
      )}

      <div className="overflow-y-auto max-h-[600px]">
        <div className="grid grid-cols-[60px_1fr] relative">
          <div className="border-r border-neutral-200">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="relative border-b border-neutral-50"
                style={{ height: HOUR_HEIGHT }}
              >
                <span className="absolute -top-2 right-2 text-[10px] text-neutral-400">
                  {String(hour).padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          <div className={`relative ${today ? 'bg-primary-50/10' : ''}`}>
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="border-b border-neutral-100"
                style={{ height: HOUR_HEIGHT }}
              />
            ))}
            {timedEvents.map((event) => {
              const pos = getEventPosition(event);
              const colors = CATEGORY_COLORS[event.category];
              return (
                <button
                  key={event.id}
                  onClick={() => onEventClick?.(event)}
                  className={`absolute left-1 right-3 rounded-lg px-3 py-1.5 border-l-[3px] overflow-hidden ${colors.bg} ${colors.border} hover:shadow-md transition-shadow`}
                  style={{ top: pos.top, height: pos.height }}
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${colors.text}`}>
                      {event.title}
                    </span>
                  </div>
                  <p className={`text-[11px] ${colors.text} opacity-70 mt-0.5`}>
                    {format(new Date(event.startTime), 'HH:mm')} – {format(new Date(event.endTime), 'HH:mm')}
                  </p>
                  {event.description && (
                    <p className="text-[11px] text-neutral-500 mt-0.5 truncate">
                      {event.description}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
