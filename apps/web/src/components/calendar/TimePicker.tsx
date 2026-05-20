import { useMemo, useCallback } from 'react';

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) =>
  String(i * 5).padStart(2, '0')
);

export function TimePicker({ value, onChange, label, error }: TimePickerProps) {
  const { hour, minute } = useMemo(() => {
    const parts = (value || '00:00').split(':');
    return {
      hour: parts[0] || '00',
      minute: parts[1] || '00',
    };
  }, [value]);

  const displayMinute = useMemo(() => {
    const num = parseInt(minute, 10);
    const snapped = Math.round(num / 5) * 5;
    return String(snapped >= 60 ? 55 : snapped).padStart(2, '0');
  }, [minute]);

  const handleHourChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange(`${e.target.value}:${displayMinute}`);
    },
    [onChange, displayMinute]
  );

  const handleMinuteChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange(`${hour}:${e.target.value}`);
    },
    [onChange, hour]
  );

  return (
    <div>
      {label && (
        <label className="block text-xs font-medium text-neutral-500 mb-1">
          {label}
        </label>
      )}
      <div
        className={`
          flex items-center gap-1 px-3 py-2 rounded-lg border transition-all
          bg-neutral-50 hover:border-neutral-300
          focus-within:border-[#5B8A72] focus-within:ring-2 focus-within:ring-[#5B8A72]/20
          ${error ? 'border-red-300' : 'border-neutral-200'}
        `}
      >
        <svg
          className="w-4 h-4 text-[#5B8A72] shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx="12" cy="12" r="10" />
          <path strokeLinecap="round" d="M12 6v6l4 2" />
        </svg>

        <div className="relative flex items-center">
          <select
            value={hour}
            onChange={handleHourChange}
            aria-label={label ? `${label} 시` : '시'}
            className="appearance-none bg-transparent text-[#2C3E50] font-semibold text-sm outline-none cursor-pointer pr-4 py-0.5 min-w-[2rem] text-center"
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
          <svg
            className="w-3 h-3 text-neutral-400 absolute right-0 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        <span className="text-[#5B8A72] font-bold text-sm select-none">:</span>

        <div className="relative flex items-center">
          <select
            value={displayMinute}
            onChange={handleMinuteChange}
            aria-label={label ? `${label} 분` : '분'}
            className="appearance-none bg-transparent text-[#2C3E50] font-semibold text-sm outline-none cursor-pointer pr-4 py-0.5 min-w-[2rem] text-center"
          >
            {MINUTES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <svg
            className="w-3 h-3 text-neutral-400 absolute right-0 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
