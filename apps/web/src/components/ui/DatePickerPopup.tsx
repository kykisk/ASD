import { useState, useRef, useEffect } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  isAfter,
  startOfDay,
} from 'date-fns';
import { ko } from 'date-fns/locale';

interface DatePickerPopupProps {
  selectedDate: Date;
  onChange: (date: Date) => void;
  maxDate?: Date;
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export function DatePickerPopup({
  selectedDate,
  onChange,
  maxDate,
}: DatePickerPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(startOfMonth(selectedDate));
  const containerRef = useRef<HTMLDivElement>(null);

  const effectiveMax = maxDate ?? startOfDay(new Date());
  const today = startOfDay(new Date());

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    setViewMonth(startOfMonth(selectedDate));
  }, [selectedDate]);

  const formattedDate = format(selectedDate, 'yyyy년 M월 d일 (EEE)', { locale: ko });
  const isToday = isSameDay(selectedDate, today);

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const weeks: Date[][] = [];
  let day = calStart;
  while (day <= calEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(day);
      day = addDays(day, 1);
    }
    weeks.push(week);
  }

  const canGoNext = !isAfter(startOfMonth(addMonths(viewMonth, 1)), startOfMonth(effectiveMax));

  function handleSelect(date: Date) {
    if (isAfter(startOfDay(date), effectiveMax)) return;
    onChange(date);
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#E8E4DF] text-sm font-medium text-[#2C3E50] hover:border-[#5B8A72]/40 hover:shadow-[0_2px_8px_rgba(91,138,114,0.1)] transition-all duration-150 min-h-[40px]"
      >
        <svg className="w-4 h-4 text-[#5B8A72]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
        <span>{formattedDate}</span>
        {isToday && (
          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-[#E8F5EE] text-[#5B8A72]">
            오늘
          </span>
        )}
        <svg
          className={`w-3.5 h-3.5 text-[#94A3B4] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-xl border border-[#E8E4DF] shadow-[0_12px_40px_rgba(91,138,114,0.15)] p-4 animate-fade-in min-w-[280px]">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setViewMonth(subMonths(viewMonth, 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#5B8A72] hover:bg-[#E8F5EE] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-[#2C3E50]">
              {format(viewMonth, 'yyyy년 M월', { locale: ko })}
            </span>
            <button
              onClick={() => canGoNext && setViewMonth(addMonths(viewMonth, 1))}
              disabled={!canGoNext}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                canGoNext ? 'text-[#5B8A72] hover:bg-[#E8F5EE]' : 'text-[#D4D0CC] cursor-not-allowed'
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {DAY_LABELS.map((label, i) => (
              <div
                key={i}
                className={`text-center text-[11px] font-medium py-1.5 ${
                  i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-[#94A3B4]'
                }`}
              >
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {weeks.map((week, wi) =>
              week.map((d, di) => {
                const isCurrentMonth = isSameMonth(d, viewMonth);
                const isSelected = isSameDay(d, selectedDate);
                const isTodayDate = isSameDay(d, today);
                const isFuture = isAfter(startOfDay(d), effectiveMax);

                return (
                  <button
                    key={`${wi}-${di}`}
                    onClick={() => !isFuture && isCurrentMonth && handleSelect(d)}
                    disabled={isFuture || !isCurrentMonth}
                    className={`
                      w-9 h-9 rounded-full flex items-center justify-center text-sm transition-all duration-150 relative
                      ${!isCurrentMonth ? 'text-[#D4D0CC] cursor-default' : ''}
                      ${isCurrentMonth && isFuture ? 'text-[#D4D0CC] cursor-not-allowed' : ''}
                      ${isCurrentMonth && !isFuture && !isSelected ? 'text-[#2C3E50] hover:bg-[#E8F5EE] cursor-pointer' : ''}
                      ${isSelected ? 'bg-[#5B8A72] text-white font-semibold shadow-[0_2px_8px_rgba(91,138,114,0.3)]' : ''}
                      ${isTodayDate && !isSelected ? 'ring-1 ring-[#5B8A72] font-semibold text-[#5B8A72]' : ''}
                    `}
                  >
                    {d.getDate()}
                  </button>
                );
              }),
            )}
          </div>

          {!isToday && (
            <button
              onClick={() => handleSelect(today)}
              className="mt-3 w-full py-2 rounded-lg text-xs font-medium text-[#5B8A72] bg-[#E8F5EE]/60 hover:bg-[#E8F5EE] transition-colors"
            >
              오늘로 이동
            </button>
          )}
        </div>
      )}
    </div>
  );
}
