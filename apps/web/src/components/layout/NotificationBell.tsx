import { useState, useRef, useEffect } from 'react';
import {
  useNotifications,
  useUnreadCount,
  useMarkRead,
  useMarkAllRead,
  NotificationType,
} from '../../hooks/use-notifications';

const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  ASSESSMENT_DUE: '📝',
  CURRICULUM_READY: '🤖',
  MILESTONE_ACHIEVED: '🌟',
  INPUT_REMINDER: '⏰',
  WEEKLY_INSIGHT_READY: '✨',
  SYSTEM: 'ℹ️',
};

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '방금';
  if (minutes < 60) return `${minutes}분 전`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;

  const days = Math.floor(hours / 24);
  if (days === 1) return '어제';

  const d = new Date(dateStr);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: notifications } = useNotifications();
  const { data: unreadCount } = useUnreadCount();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const displayCount = unreadCount ?? 0;
  const displayNotifications = (notifications ?? []).slice(0, 10);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-neutral-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label="알림"
      >
        <svg className="w-5 h-5 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {displayCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold animate-[bellPulse_2s_ease-in-out_infinite]">
            {displayCount > 99 ? '99+' : displayCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-white border border-neutral-200 rounded-xl shadow-lg z-50 max-h-96 flex flex-col animate-fade-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
            <h3 className="text-sm font-semibold text-neutral-800">알림</h3>
            {displayCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
              >
                모두 읽음
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {displayNotifications.length === 0 ? (
              <div className="py-10 text-center">
                <span className="text-2xl block mb-2">🔔</span>
                <p className="text-sm text-neutral-400">알림이 없어요</p>
              </div>
            ) : (
              displayNotifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => {
                    if (!notif.read) markRead.mutate(notif.id);
                  }}
                  className={`w-full text-left px-4 py-3 border-b border-neutral-50 last:border-b-0 transition-colors hover:bg-neutral-50 ${
                    notif.read ? 'bg-white' : 'bg-[#F0F9F5]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg shrink-0 mt-0.5">
                      {NOTIFICATION_ICONS[notif.type] || 'ℹ️'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm truncate ${notif.read ? 'text-neutral-600' : 'font-semibold text-neutral-800'}`}>
                          {notif.title}
                        </span>
                        <span className="text-[11px] text-neutral-400 shrink-0">
                          {formatTimeAgo(notif.createdAt)}
                        </span>
                      </div>
                      <p className="text-[13px] text-neutral-500 mt-0.5 line-clamp-2">
                        {notif.body}
                      </p>
                    </div>
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-primary-500 mt-2 shrink-0" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes bellPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
