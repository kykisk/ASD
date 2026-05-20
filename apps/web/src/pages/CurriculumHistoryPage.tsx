import { useState } from 'react';
import { useChildStore } from '../stores/child.store';
import { useChildren } from '../hooks/use-children';
import { useMyFamily } from '../hooks/use-families';
import { useCurriculumHistory } from '../hooks/use-curriculum';
import { PageHeader } from '../components/ui/PageHeader';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import type { Curriculum, ActivityDomain } from '../types/curriculum';
import { DOMAIN_LABELS } from '../types/curriculum';

const STATUS_BADGES: Record<string, { label: string; icon: string; className: string }> = {
  COMPLETED: { label: '완료', icon: '✅', className: 'bg-primary-100 text-primary-700' },
  CONFIRMED: { label: '확인됨', icon: '📋', className: 'bg-blue-50 text-blue-700' },
  GENERATED: { label: '생성됨', icon: '⏳', className: 'bg-amber-50 text-amber-700' },
  PENDING: { label: '대기중', icon: '⏳', className: 'bg-neutral-100 text-neutral-600' },
  FAILED: { label: '실패', icon: '❌', className: 'bg-red-50 text-red-600' },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

function getDomainSummary(activities: Curriculum['activities']): string {
  const counts: Partial<Record<ActivityDomain, number>> = {};
  for (const a of activities) {
    counts[a.domain] = (counts[a.domain] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([domain, count]) => `${DOMAIN_LABELS[domain as ActivityDomain]} 활동 ${count}개`)
    .join(', ');
}

interface HistoryItemProps {
  curriculum: Curriculum;
}

function HistoryItem({ curriculum }: HistoryItemProps) {
  const [expanded, setExpanded] = useState(false);
  const badge = STATUS_BADGES[curriculum.status] ?? STATUS_BADGES.PENDING;

  return (
    <div className="border-b border-neutral-100 last:border-b-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-neutral-50/50 transition-colors"
      >
        <svg
          className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-neutral-800">
              {formatDate(curriculum.date)}
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${badge.className}`}>
              {badge.icon} {badge.label}
            </span>
          </div>
          {!expanded && (
            <p className="text-xs text-neutral-500 mt-0.5 truncate">
              {getDomainSummary(curriculum.activities)}
            </p>
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pl-11 space-y-2 animate-fade-in">
          <p className="text-xs text-neutral-500">
            {getDomainSummary(curriculum.activities)}
          </p>

          {curriculum.weeklyGoal && (
            <p className="text-xs text-primary-600">
              🎯 {curriculum.weeklyGoal}
            </p>
          )}

          <div className="space-y-1.5 mt-2">
            {curriculum.activities.map((activity, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-neutral-700">
                <span className="w-4 h-4 rounded bg-neutral-100 text-neutral-500 text-xs flex items-center justify-center font-medium shrink-0">
                  {i + 1}
                </span>
                <span className="truncate">{activity.title}</span>
                <span className="text-xs text-neutral-400 shrink-0">
                  {activity.durationMin}분
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function CurriculumHistoryPage() {
  const { selectedChildId } = useChildStore();
  const { data: family } = useMyFamily();
  const { data: children } = useChildren(family?.id);
  const [limit, setLimit] = useState(10);
  const { data: curricula, isLoading } = useCurriculumHistory(selectedChildId, limit);

  const selectedChild = children?.find((c) => c.id === selectedChildId);

  if (!selectedChildId) {
    return (
      <div>
        <PageHeader title="커리큘럼 기록" backTo="/curriculum" />
        <EmptyState
          icon={
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
            </svg>
          }
          title="상단에서 아이를 선택해주세요"
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div>
        <PageHeader
          title="커리큘럼 기록"
          subtitle={selectedChild?.name}
          backTo="/curriculum"
        />
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sage-sm p-5">
          <Skeleton lines={6} />
        </div>
      </div>
    );
  }

  if (!curricula || curricula.length === 0) {
    return (
      <div>
        <PageHeader
          title="커리큘럼 기록"
          subtitle={selectedChild?.name}
          backTo="/curriculum"
        />
        <EmptyState
          icon={
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.331 0 4.472.89 6.075 2.356M12 6.042c1.61-1.29 3.654-2.062 5.906-2.292A8.987 8.987 0 0121 3.75v14.25a8.966 8.966 0 00-3-.512c-2.252 0-4.295.772-5.906 2.062M12 6.042V20.356" />
            </svg>
          }
          title="아직 커리큘럼 기록이 없어요"
          description="커리큘럼을 생성하면 여기에 기록이 쌓여요"
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="커리큘럼 기록"
        subtitle={selectedChild?.name}
        backTo="/curriculum"
      />

      <div className="bg-white rounded-xl border border-neutral-200 shadow-sage-sm overflow-hidden">
        {curricula.map((c) => (
          <HistoryItem key={c.id} curriculum={c} />
        ))}
      </div>

      {curricula.length >= limit && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setLimit((l) => l + 10)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium text-neutral-600 bg-white border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
          >
            더 보기
          </button>
        </div>
      )}
    </div>
  );
}
