import {
  startOfWeek,
  addDays,
  format,
  isSameDay,
  isToday,
  differenceInMinutes,
  startOfDay,
} from 'date-fns';
import { Schedule, CATEGORY_COLORS } from '../../types/schedule';
import { EventBlock } from './EventBlock';

interface WeekViewProps {
  currentDate: Date;
  schedules: Schedule[];
  onEventClick?: (schedule: Schedule) => void;
  onFeedbackClick?: (schedule: Schedule) => void;
  onDateClick?: (dateStr: string) => void;
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 48;

export function WeekView({
  currentDate,
  schedules,
  onEventClick,
  onFeedbackClick,
  onDateClick,
}: WeekViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const allDayEvents = schedules.filter((s) => s.isAllDay);
  const timedEvents = schedules.filter((s) => !s.isAllDay);

  function getEventsForDay(day: Date, events: Schedule[]): Schedule[] {
    return events.filter((s) => isSameDay(new Date(s.startTime), day));
  }

  function getEventPosition(schedule: Schedule) {
    const start = new Date(schedule.startTime);
    const end = new Date(schedule.endTime);
    const dayStart = startOfDay(start);
    const topMinutes = differenceInMinutes(start, dayStart);
    const durationMinutes = differenceInMinutes(end, start);
    const top = (topMinutes / 60) * HOUR_HEIGHT;
    const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, 20);
    return { top, height };
  }

  return (
    <div className="border border-neutral-200 rounded-lg overflow-hidden bg-white">
      {/* Day headers */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-neutral-200 bg-neutral-50">
        <div className="border-r border-neutral-200" />
        {weekDays.map((day, i) => {
          const today = isToday(day);
          return (
            <div
              key={i}
              className={`px-1 py-2 text-center border-r border-neutral-100 last:border-r-0 ${
                today ? 'bg-primary-50/50' : ''
              }`}
            >
              <span
                className={`text-[11px] font-medium ${
                  i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-neutral-400'
                }`}
              >
                {DAY_NAMES[i]}
              </span>
              <div className="relative flex items-center justify-center mt-0.5">
                <span
                  className={`block text-sm mx-auto ${
                    today
                      ? 'w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold'
                      : 'font-semibold text-neutral-700 w-7 h-7 flex items-center justify-center'
                  }`}
                >
                  {format(day, 'd')}
                </span>
                {onDateClick && (
                  <button
                    type="button"
                    onClick={() => onDateClick(format(day, 'yyyy-MM-dd'))}
                    className="absolute -top-0.5 -right-3 w-4 h-4 flex items-center justify-center rounded text-neutral-300 hover:text-[#5B8A72] hover:bg-[#5B8A72]/10 transition-colors"
                    title="피드백 보기"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* All-day events */}
      {allDayEvents.length > 0 && (
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-neutral-200 bg-neutral-50/50">
          <div className="border-r border-neutral-200 px-1 py-1 text-[10px] text-neutral-400 text-right pr-2">
            종일
          </div>
          {weekDays.map((day, i) => {
            const dayAllDay = getEventsForDay(day, allDayEvents);
            return (
              <div
                key={i}
                className="border-r border-neutral-100 last:border-r-0 p-0.5 space-y-0.5"
              >
                {dayAllDay.map((event) => (
                  <EventBlock
                    key={event.id}
                    schedule={event}
                    compact
                    onClick={onEventClick}
                    onFeedbackClick={onFeedbackClick}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Time grid */}
      <div className="overflow-y-auto max-h-[600px]">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] relative">
          {/* Time labels */}
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

          {/* Day columns */}
          {weekDays.map((day, dayIdx) => {
            const dayEvents = getEventsForDay(day, timedEvents);
            const today = isToday(day);
            return (
              <div
                key={dayIdx}
                className={`relative border-r border-neutral-100 last:border-r-0 ${
                  today ? 'bg-primary-50/20' : ''
                }`}
              >
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="border-b border-neutral-100"
                    style={{ height: HOUR_HEIGHT }}
                  />
                ))}
                {dayEvents.map((event) => {
                  const pos = getEventPosition(event);
                  const colors = CATEGORY_COLORS[event.category];
                  return (
                    <button
                      key={event.id}
                      onClick={() => onEventClick?.(event)}
                      className={`absolute left-0.5 right-0.5 rounded-md px-1.5 py-0.5 border-l-[3px] overflow-hidden ${colors.bg} ${colors.border} hover:shadow-md transition-shadow`}
                      style={{ top: pos.top, height: pos.height }}
                    >
                      <p className={`text-[11px] font-medium ${colors.text} truncate`}>
                        {event.title}
                      </p>
                      <p className={`text-[10px] ${colors.text} opacity-60`}>
                        {format(new Date(event.startTime), 'HH:mm')}
                      </p>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
