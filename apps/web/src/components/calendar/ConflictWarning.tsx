import { format } from 'date-fns';
import { ConflictInfo } from '../../hooks/use-conflict-check';

interface ConflictWarningProps {
  conflicts: ConflictInfo[];
}

export function ConflictWarning({ conflicts }: ConflictWarningProps) {
  if (conflicts.length === 0) return null;

  return (
    <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 animate-[fadeIn_0.2s_ease-out]">
      <div className="flex items-start gap-2">
        <svg
          className="w-5 h-5 text-amber-500 shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-700">
            충돌하는 일정이 있습니다:
          </p>
          <ul className="mt-1.5 space-y-1">
            {conflicts.map((c) => (
              <li
                key={c.schedule.id}
                className="text-xs text-amber-600 flex items-center gap-1.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                <span className="font-medium">{c.schedule.title}</span>
                <span className="text-amber-500">
                  ({format(new Date(c.schedule.startTime), 'HH:mm')} –{' '}
                  {format(new Date(c.schedule.endTime), 'HH:mm')})
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
