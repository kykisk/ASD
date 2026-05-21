import { useState } from 'react';
import { useChildStore } from '../stores/child.store';
import { useWeeklyInsight, useInsightHistory, InsightRecord } from '../hooks/use-insights';
import { Skeleton, EmptyState } from '../components/ui';

const TREND_CONFIG: Record<InsightRecord['overallTrend'], { label: string; color: string; bg: string }> = {
  IMPROVING: { label: '성장 중', color: '#5B8A72', bg: '#E8F5EE' },
  STABLE: { label: '안정', color: '#64748B', bg: '#F1F5F9' },
  NEEDS_ATTENTION: { label: '관심 필요', color: '#D97706', bg: '#FFFBEB' },
};

function getWeekLabel(weekKey: string): string {
  return weekKey;
}

function InsightDetailCard({ insight }: { insight: InsightRecord }) {
  const trendCfg = TREND_CONFIG[insight.overallTrend];

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="bg-gradient-to-br from-[#E8F5EE] to-white border border-primary-100 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-neutral-800">전체 요약</h3>
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-lg"
            style={{ color: trendCfg.color, background: trendCfg.bg }}
          >
            {trendCfg.label}
          </span>
        </div>
        <p className="text-sm text-neutral-700 leading-relaxed">
          {insight.summary}
        </p>
      </div>

      {/* Highlights */}
      {insight.highlights.length > 0 && (
        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <h4 className="text-[15px] font-semibold text-neutral-800 mb-3 flex items-center gap-2">
            <span>🌟</span> 하이라이트
            <span className="text-xs font-medium text-neutral-400">({insight.highlights.length}개)</span>
          </h4>
          <div className="grid gap-2.5">
            {insight.highlights.map((h, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-green-50/60 border border-green-100">
                <span className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
                <span className="text-sm text-neutral-700">{h}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Concerns */}
      {insight.concerns.length > 0 && (
        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <h4 className="text-[15px] font-semibold text-neutral-800 mb-3 flex items-center gap-2">
            <span>⚠️</span> 관심 영역
          </h4>
          <div className="grid gap-2.5">
            {insight.concerns.map((c, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-amber-50/60 border border-amber-100">
                <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <span className="text-sm text-neutral-700">{c}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {insight.recommendations.length > 0 && (
        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <h4 className="text-[15px] font-semibold text-neutral-800 mb-3 flex items-center gap-2">
            <span>💡</span> 추천 활동
          </h4>
          <div className="grid gap-2.5">
            {insight.recommendations.map((r, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-blue-50/60 border border-blue-100">
                <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                <span className="text-sm text-neutral-700">{r}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HistorySection({ history }: { history: InsightRecord[] }) {
  const [expanded, setExpanded] = useState(false);

  if (history.length === 0) return null;

  const displayHistory = expanded ? history : history.slice(0, 2);

  return (
    <div className="mt-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-[15px] font-semibold text-neutral-800 mb-4 hover:text-primary-700 transition-colors"
      >
        <svg
          className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        지난 분석 기록 ({history.length}주)
      </button>

      {displayHistory.map((record) => {
        const trendCfg = TREND_CONFIG[record.overallTrend];
        return (
          <div
            key={record.weekKey}
            className="mb-3 p-4 bg-white border border-neutral-200 rounded-xl"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-neutral-600">
                {getWeekLabel(record.weekKey)}
              </span>
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-md"
                style={{ color: trendCfg.color, background: trendCfg.bg }}
              >
                {trendCfg.label}
              </span>
            </div>
            <p className="text-sm text-neutral-600 line-clamp-2">
              {record.summary}
            </p>
          </div>
        );
      })}

      {!expanded && history.length > 2 && (
        <button
          onClick={() => setExpanded(true)}
          className="text-[13px] text-primary-600 font-semibold hover:text-primary-700 transition-colors"
        >
          더보기 →
        </button>
      )}
    </div>
  );
}

export function InsightsPage() {
  const { selectedChildId } = useChildStore();
  const [weekOffset, setWeekOffset] = useState(0);
  const { data: currentInsight, isLoading } = useWeeklyInsight(selectedChildId);
  const { data: history } = useInsightHistory(selectedChildId, 4);

  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const currentWeekNum = Math.ceil((days + startOfYear.getDay() + 1) / 7) + weekOffset;
  const displayWeekKey = `${now.getFullYear()}-W${String(currentWeekNum).padStart(2, '0')}`;

  if (!selectedChildId) {
    return (
      <EmptyState
        icon={<span className="text-3xl">👶</span>}
        title="아이를 선택해주세요"
        description="상단에서 아이를 선택하면 AI 분석을 확인할 수 있어요"
      />
    );
  }

  return (
    <div className="max-w-[800px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">✨</span>
          <h1 className="text-2xl font-bold text-neutral-800">AI 성장 분석</h1>
        </div>
        <p className="text-sm text-neutral-500">주간 발달 인사이트</p>
      </div>

      {/* Week Selector */}
      <div className="flex items-center justify-between mb-6 p-3 bg-white border border-neutral-200 rounded-xl">
        <button
          onClick={() => setWeekOffset((p) => p - 1)}
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-neutral-600 hover:bg-neutral-100 transition-colors min-h-[40px]"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          지난주
        </button>
        <span className="text-sm font-semibold text-neutral-800">
          {weekOffset === 0 ? '이번 주' : ''} ({displayWeekKey})
        </span>
        <button
          onClick={() => setWeekOffset((p) => Math.min(p + 1, 0))}
          disabled={weekOffset >= 0}
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-h-[40px]"
        >
          다음주
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          <div className="bg-white border border-neutral-200 rounded-xl p-5">
            <Skeleton height="h-5" className="w-1/3 mb-3" />
            <Skeleton lines={3} />
          </div>
          <div className="bg-white border border-neutral-200 rounded-xl p-5">
            <Skeleton height="h-5" className="w-1/4 mb-3" />
            <Skeleton lines={2} />
          </div>
        </div>
      ) : currentInsight ? (
        <InsightDetailCard insight={currentInsight} />
      ) : (
        <div className="bg-gradient-to-br from-[#E8F5EE] to-white border border-primary-100 rounded-xl p-8 text-center">
          <span className="text-4xl mb-3 block">✨</span>
          <h3 className="text-lg font-semibold text-neutral-800 mb-2">AI 분석 준비 중</h3>
          <p className="text-sm text-neutral-500 leading-relaxed">
            평가 데이터를 조금 더 쌓으면 인사이트를 제공해드릴게요.<br />
            매주 평가를 기록해주시면 더 정확한 분석이 가능해요.
          </p>
        </div>
      )}

      {/* History */}
      {history && history.length > 0 && (
        <HistorySection history={history} />
      )}
    </div>
  );
}
