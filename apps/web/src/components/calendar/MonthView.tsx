import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';
import { Schedule } from '../../types/schedule';
import { EventBlock } from './EventBlock';

interface MonthViewProps {
  currentDate: Date;
  schedules: Schedule[];
  onEventClick?: (schedule: Schedule) => void;
  onFeedbackClick?: (schedule: Schedule) => void;
  onDateClick?: (dateStr: string) => void;
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
const MAX_VISIBLE_EVENTS = 3;

export function MonthView({
  currentDate,
  schedules,
  onEventClick,
  onFeedbackClick,
  onDateClick,
}: MonthViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  function getEventsForDay(day: Date): Schedule[] {
    return schedules.filter((s) => {
      const eventDate = new Date(s.startTime);
      return isSameDay(eventDate, day);
    });
  }

  return (
    <div className="border border-neutral-200 rounded-lg overflow-hidden bg-white">
      <div className="grid grid-cols-7 border-b border-neutral-200">
        {DAY_NAMES.map((name, i) => (
          <div
            key={name}
            className={`px-2 py-2.5 text-center text-xs font-semibold ${
              i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-neutral-600'
            } bg-neutral-50`}
          >
            {name}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const events = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const today = isToday(day);
          const dayOfWeek = day.getDay();

          return (
            <div
              key={idx}
              className={`relative min-h-[100px] border-b border-r border-neutral-100 p-1 ${
                !isCurrentMonth ? 'bg-neutral-50/50' : ''
              } ${idx % 7 === 6 ? 'border-r-0' : ''}`}
            >
              {onDateClick && isCurrentMonth && (
                <button
                  type="button"
                  onClick={() => onDateClick(format(day, 'yyyy-MM-dd'))}
                  className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded text-neutral-300 hover:text-[#5B8A72] hover:bg-[#5B8A72]/10 transition-colors"
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
              <div className="flex justify-center mb-1">
                <span
                  className={`inline-flex items-center justify-center w-6 h-6 text-xs rounded-full ${
                    today
                      ? 'bg-primary-500 text-white font-bold'
                      : !isCurrentMonth
                        ? 'text-neutral-300'
                        : dayOfWeek === 0
                          ? 'text-red-500 font-medium'
                          : dayOfWeek === 6
                            ? 'text-blue-500 font-medium'
                            : 'text-neutral-700 font-medium'
                  }`}
                >
                  {format(day, 'd')}
                </span>
              </div>

              <div className="space-y-0.5">
                {events.slice(0, MAX_VISIBLE_EVENTS).map((event) => (
                  <EventBlock
                    key={event.id}
                    schedule={event}
                    compact
                    onClick={onEventClick}
                    onFeedbackClick={onFeedbackClick}
                  />
                ))}
                {events.length > MAX_VISIBLE_EVENTS && (
                  <p className="text-[10px] text-neutral-400 text-center font-medium">
                    +{events.length - MAX_VISIBLE_EVENTS}개 더보기
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
