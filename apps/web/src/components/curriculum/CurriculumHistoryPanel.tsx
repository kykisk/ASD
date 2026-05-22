import { useState } from 'react';
import { isSameDay } from 'date-fns';
import { useCurriculumHistory } from '../../hooks/use-curriculum';
import { DatePickerPopup } from '../ui/DatePickerPopup';
import type { Curriculum, ActivityDomain } from '../../types/curriculum';

const STATUS_BADGES: Record<string, { label: string; icon: string; className: string }> = {
  COMPLETED: { label: '완료', icon: '✅', className: 'bg-[#E8F5EE] text-[#3D6B54]' },
  CONFIRMED: { label: '확인됨', icon: '📋', className: 'bg-blue-50 text-blue-700' },
  GENERATED: { label: '생성됨', icon: '⏳', className: 'bg-amber-50 text-amber-700' },
  PENDING: { label: '대기중', icon: '⏳', className: 'bg-neutral-100 text-neutral-600' },
  FAILED: { label: '실패', icon: '❌', className: 'bg-red-50 text-red-600' },
};

function getCompletionText(activities: Curriculum['activities'], status: string): string {
  const total = activities.length;
  if (status === 'COMPLETED') return `완료 (${total}/${total})`;
  if (status === 'CONFIRMED') return `확인됨 (${total}개 활동)`;
  return `${total}개 활동`;
}

interface CurriculumDayCardProps {
  curriculum: Curriculum;
}

function CurriculumDayCard({ curriculum }: CurriculumDayCardProps) {
  const [expanded, setExpanded] = useState(false);
  const badge = STATUS_BADGES[curriculum.status] ?? STATUS_BADGES.PENDING;

  const domainIcons: Record<ActivityDomain, string> = {
    COMMUNICATION: '🗣️',
    SOCIAL: '🤝',
    MOTOR: '🏃',
    COGNITIVE: '🧩',
    EMOTIONAL: '💛',
    DAILY_LIVING: '🏠',
  };

  const visibleActivities = expanded ? curriculum.activities : curriculum.activities.slice(0, 3);
  const hiddenCount = curriculum.activities.length - 3;

  return (
    <div className="bg-[#F8FBF9] rounded-xl border border-[#E8E4DF] p-4 transition-shadow duration-200 hover:shadow-[0_2px_12px_rgba(91,138,114,0.1)]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-[#2C3E50]">
          {getCompletionText(curriculum.activities, curriculum.status)}
        </span>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${badge.className}`}>
          {badge.icon} {badge.label}
        </span>
      </div>

      <div className="space-y-2">
        {visibleActivities.map((activity, i) => {
          const icon = domainIcons[activity.domain] || '📝';
          return (
            <div key={i} className="flex items-center gap-2.5 text-sm text-[#2C3E50]">
              <span className="text-base shrink-0">{icon}</span>
              <span className="truncate flex-1">{activity.title}</span>
              <span className="text-xs text-[#94A3B4] shrink-0 tabular-nums">
                {activity.durationMin}분
              </span>
            </div>
          );
        })}
      </div>

      {hiddenCount > 0 && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-2.5 text-xs font-medium text-[#5B8A72] hover:text-[#3D6B54] transition-colors"
        >
          +{hiddenCount}개 더보기
        </button>
      )}

      {expanded && hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(false)}
          className="mt-2.5 text-xs font-medium text-[#5B8A72] hover:text-[#3D6B54] transition-colors"
        >
          접기
        </button>
      )}

      {curriculum.weeklyGoal && expanded && (
        <div className="mt-3 pt-3 border-t border-[#E8E4DF]">
          <p className="text-xs text-[#5B8A72] font-medium">
            🎯 {curriculum.weeklyGoal}
          </p>
        </div>
      )}
    </div>
  );
}

interface CurriculumHistoryPanelProps {
  childId: string | null;
}

export function CurriculumHistoryPanel({ childId }: CurriculumHistoryPanelProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { data: history, isLoading } = useCurriculumHistory(childId, 30);

  const dayCurriculum = (history ?? []).find((c: Curriculum) => {
    const currDate = new Date(c.date);
    return isSameDay(currDate, selectedDate);
  });

  return (
    <div className="bg-white rounded-2xl border border-[#E8E4DF] shadow-[0_4px_16px_rgba(91,138,114,0.08)] p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">📋</span>
        <span className="text-base font-semibold text-[#2C3E50]">커리큘럼 기록</span>
      </div>

      <div className="mb-4">
        <DatePickerPopup selectedDate={selectedDate} onChange={setSelectedDate} />
      </div>

      <div className="min-h-[120px]">
        {isLoading && (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 border-[2.5px] border-[#E8E4DF] border-t-[#5B8A72] rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && !dayCurriculum && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <span className="text-4xl opacity-70">🗓️</span>
            <p className="text-sm font-medium text-[#94A3B4]">이 날 커리큘럼이 없어요</p>
          </div>
        )}

        {!isLoading && dayCurriculum && (
          <div className="animate-fade-in">
            <CurriculumDayCard curriculum={dayCurriculum} />
          </div>
        )}
      </div>
    </div>
  );
}
