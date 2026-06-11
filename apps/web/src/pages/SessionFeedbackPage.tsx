import { useState, useMemo } from 'react';
import { useChildStore } from '../stores/child.store.js';
import {
  useSessionFeedbacks,
  useDeleteSessionFeedback,
  useFeedbackDigests,
  useGenerateFeedbackDigest,
  type SessionFeedback,
  type FeedbackDigest,
  type FeedbackType,
} from '../hooks/use-session-feedbacks.js';
import { SessionFeedbackModal } from '../components/session-feedback/SessionFeedbackModal.js';
import { PageHeader } from '../components/ui/index.js';

type PageTab = 'session' | 'daily' | 'digest';

const TABS: { key: PageTab; label: string }[] = [
  { key: 'session', label: '수업피드백' },
  { key: 'daily', label: '일상기록' },
  { key: 'digest', label: 'AI주간요약' },
];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

function formatDateKorean(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={`text-sm ${star <= rating ? 'opacity-100' : 'opacity-20'}`}>
          ⭐
        </span>
      ))}
    </span>
  );
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function addDaysToDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function get30DaysAgo(): string {
  return addDaysToDate(getToday(), -30);
}

/** Find the most recent date in feedbacks that has at least one matching feedbackType */
function findLastDateWithType(
  feedbacks: SessionFeedback[] | undefined,
  types: FeedbackType[],
): string | null {
  if (!feedbacks || feedbacks.length === 0) return null;
  const matching = feedbacks.filter((f) => types.includes(f.feedbackType ?? 'SESSION'));
  if (matching.length === 0) return null;
  // Sort by sessionDate descending
  const sorted = [...matching].sort(
    (a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime(),
  );
  return sorted[0].sessionDate.split('T')[0];
}

// ─── Session Feedback Tab ────────────────────────────────────────────────────

function SessionTab({ childId }: { childId: string }) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Fetch last 30 days to find most recent session date
  const thirtyDaysAgo = get30DaysAgo();
  const today = getToday();
  const { data: recentFeedbacks, isLoading: loadingRecent } = useSessionFeedbacks(childId, {
    startDate: thirtyDaysAgo,
    endDate: today,
  });

  // Determine the display date
  const displayDate = useMemo(() => {
    if (selectedDate) return selectedDate;
    return findLastDateWithType(recentFeedbacks, ['SESSION']);
  }, [selectedDate, recentFeedbacks]);

  // Filter feedbacks for display date that are SESSION type
  const dayFeedbacks = useMemo(() => {
    if (!recentFeedbacks || !displayDate) return [];
    return recentFeedbacks.filter((f) => {
      const fDate = f.sessionDate.split('T')[0];
      return fDate === displayDate && (f.feedbackType ?? 'SESSION') === 'SESSION';
    });
  }, [recentFeedbacks, displayDate]);

  const deleteFeedback = useDeleteSessionFeedback(childId);

  if (loadingRecent) {
    return (
      <div className="bg-white rounded-2xl border border-[#e8e4df] p-12 text-center">
        <div className="text-2xl mb-2 animate-pulse">📚</div>
        <p className="text-sm text-neutral-400">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Date Navigation */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-[#e8e4df] px-4 py-3">
        <button
          onClick={() => setSelectedDate(addDaysToDate(displayDate || today, -1))}
          className="p-2 rounded-lg hover:bg-neutral-100 transition-colors text-neutral-600"
        >
          ◀
        </button>
        <span className="text-sm font-semibold text-neutral-700">
          {displayDate ? formatDateKorean(displayDate) : '데이터 없음'}
        </span>
        <button
          onClick={() => setSelectedDate(addDaysToDate(displayDate || today, 1))}
          className="p-2 rounded-lg hover:bg-neutral-100 transition-colors text-neutral-600"
        >
          ▶
        </button>
      </div>

      {/* Add Button */}
      <button
        onClick={() => setShowModal(true)}
        className="w-full py-3 rounded-xl text-sm font-semibold text-[#5B8A72] bg-[#5B8A72]/[0.08] hover:bg-[#5B8A72]/[0.15] transition-all border border-[#5B8A72]/20"
      >
        + 수업 기록 추가
      </button>

      {/* Feedback Cards */}
      {dayFeedbacks.length === 0 && (
        <div className="bg-white rounded-2xl border border-[#e8e4df] p-10 text-center shadow-[0_2px_16px_rgba(91,138,114,0.06)]">
          <div className="text-3xl mb-2">📚</div>
          <p className="text-sm font-medium text-neutral-500">이 날의 수업 피드백이 없습니다</p>
          <p className="text-xs text-neutral-400 mt-1">날짜를 이동하거나 새 기록을 추가해보세요</p>
        </div>
      )}

      {dayFeedbacks.map((feedback) => (
        <SessionFeedbackCard
          key={feedback.id}
          feedback={feedback}
          onDelete={(id) => deleteFeedback.mutate(id)}
        />
      ))}

      <SessionFeedbackModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        defaultFeedbackType="SESSION"
      />
    </div>
  );
}

function SessionFeedbackCard({
  feedback,
  onDelete,
}: {
  feedback: SessionFeedback;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#e8e4df] p-5 shadow-[0_2px_8px_rgba(91,138,114,0.04)] hover:shadow-[0_4px_16px_rgba(91,138,114,0.08)] transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 rounded-lg bg-[#e8f5ee] text-[#3d6b54] text-xs font-semibold">
            {feedback.sessionType}
          </span>
          <span className="text-xs text-neutral-400">{formatDate(feedback.sessionDate)}</span>
          {feedback.schedule && (
            <span className="text-xs text-neutral-400 px-2 py-0.5 rounded bg-neutral-50">
              📅 {feedback.schedule.title}
            </span>
          )}
        </div>
        <button
          onClick={() => {
            if (window.confirm('이 피드백을 삭제하시겠습니까?')) {
              onDelete(feedback.id);
            }
          }}
          className="px-2 py-1 rounded-md text-[11px] text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          삭제
        </button>
      </div>

      <div className="mb-2">
        <StarRating rating={feedback.rating} />
      </div>

      <p className="text-sm text-neutral-700 leading-relaxed mb-3">{feedback.content}</p>

      <div className="flex flex-wrap gap-2">
        {feedback.progress && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-50 text-green-700 text-xs font-medium border border-green-100">
            <span>📈</span> {feedback.progress}
          </span>
        )}
        {feedback.challenges && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100">
            <span>⚡</span> {feedback.challenges}
          </span>
        )}
        {feedback.homeWork && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
            <span>📚</span> {feedback.homeWork}
          </span>
        )}
      </div>

      {(feedback.therapistName || feedback.institution || feedback.durationMin) && (
        <div className="mt-3 pt-3 border-t border-neutral-100 flex flex-wrap gap-3 text-xs text-neutral-400">
          {feedback.therapistName && <span>👤 {feedback.therapistName}</span>}
          {feedback.institution && <span>🏢 {feedback.institution}</span>}
          {feedback.durationMin && <span>⏱️ {feedback.durationMin}분</span>}
        </div>
      )}
    </div>
  );
}

// ─── Daily Log Tab ───────────────────────────────────────────────────────────

function DailyTab({ childId }: { childId: string }) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const thirtyDaysAgo = get30DaysAgo();
  const today = getToday();
  const { data: recentFeedbacks, isLoading: loadingRecent } = useSessionFeedbacks(childId, {
    startDate: thirtyDaysAgo,
    endDate: today,
  });

  const displayDate = useMemo(() => {
    if (selectedDate) return selectedDate;
    return findLastDateWithType(recentFeedbacks, ['DAILY_LOG', 'BEHAVIORAL_ISSUE']);
  }, [selectedDate, recentFeedbacks]);

  const dayFeedbacks = useMemo(() => {
    if (!recentFeedbacks || !displayDate) return [];
    return recentFeedbacks.filter((f) => {
      const fDate = f.sessionDate.split('T')[0];
      const fType = f.feedbackType ?? 'SESSION';
      return fDate === displayDate && (fType === 'DAILY_LOG' || fType === 'BEHAVIORAL_ISSUE');
    });
  }, [recentFeedbacks, displayDate]);

  const deleteFeedback = useDeleteSessionFeedback(childId);

  if (loadingRecent) {
    return (
      <div className="bg-white rounded-2xl border border-[#e8e4df] p-12 text-center">
        <div className="text-2xl mb-2 animate-pulse">📝</div>
        <p className="text-sm text-neutral-400">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Date Navigation */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-[#e8e4df] px-4 py-3">
        <button
          onClick={() => setSelectedDate(addDaysToDate(displayDate || today, -1))}
          className="p-2 rounded-lg hover:bg-neutral-100 transition-colors text-neutral-600"
        >
          ◀
        </button>
        <span className="text-sm font-semibold text-neutral-700">
          {displayDate ? formatDateKorean(displayDate) : '데이터 없음'}
        </span>
        <button
          onClick={() => setSelectedDate(addDaysToDate(displayDate || today, 1))}
          className="p-2 rounded-lg hover:bg-neutral-100 transition-colors text-neutral-600"
        >
          ▶
        </button>
      </div>

      {/* Add Button */}
      <button
        onClick={() => setShowModal(true)}
        className="w-full py-3 rounded-xl text-sm font-semibold text-[#5B8A72] bg-[#5B8A72]/[0.08] hover:bg-[#5B8A72]/[0.15] transition-all border border-[#5B8A72]/20"
      >
        + 일상 기록 추가
      </button>

      {/* Cards */}
      {dayFeedbacks.length === 0 && (
        <div className="bg-white rounded-2xl border border-[#e8e4df] p-10 text-center shadow-[0_2px_16px_rgba(91,138,114,0.06)]">
          <div className="text-3xl mb-2">📝</div>
          <p className="text-sm font-medium text-neutral-500">이 날의 일상 기록이 없습니다</p>
          <p className="text-xs text-neutral-400 mt-1">날짜를 이동하거나 새 기록을 추가해보세요</p>
        </div>
      )}

      {dayFeedbacks.map((feedback) => (
        <DailyFeedbackCard
          key={feedback.id}
          feedback={feedback}
          onDelete={(id) => deleteFeedback.mutate(id)}
        />
      ))}

      <SessionFeedbackModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        defaultFeedbackType="DAILY_LOG"
      />
    </div>
  );
}

const SEVERITY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: '경미', color: 'bg-green-50 text-green-700 border-green-200' },
  2: { label: '약간', color: 'bg-lime-50 text-lime-700 border-lime-200' },
  3: { label: '보통', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  4: { label: '심각', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  5: { label: '매우심각', color: 'bg-red-50 text-red-700 border-red-200' },
};

function DailyFeedbackCard({
  feedback,
  onDelete,
}: {
  feedback: SessionFeedback;
  onDelete: (id: string) => void;
}) {
  const isBehavioral = (feedback.feedbackType ?? 'SESSION') === 'BEHAVIORAL_ISSUE';

  return (
    <div className="bg-white rounded-xl border border-[#e8e4df] p-5 shadow-[0_2px_8px_rgba(91,138,114,0.04)] hover:shadow-[0_4px_16px_rgba(91,138,114,0.08)] transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
              isBehavioral
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}
          >
            {isBehavioral ? '⚠️ 문제행동' : '📝 일상기록'}
          </span>
          <span className="text-xs text-neutral-400">{formatDate(feedback.sessionDate)}</span>
          {isBehavioral && feedback.severity && SEVERITY_LABELS[feedback.severity] && (
            <span
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${SEVERITY_LABELS[feedback.severity].color}`}
            >
              심각도: {SEVERITY_LABELS[feedback.severity].label}
            </span>
          )}
        </div>
        <button
          onClick={() => {
            if (window.confirm('이 기록을 삭제하시겠습니까?')) {
              onDelete(feedback.id);
            }
          }}
          className="px-2 py-1 rounded-md text-[11px] text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          삭제
        </button>
      </div>

      <p className="text-sm text-neutral-700 leading-relaxed mb-3">{feedback.content}</p>

      {/* Behavior Tags */}
      {isBehavioral && feedback.behaviorTags && feedback.behaviorTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {feedback.behaviorTags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-md bg-red-50 text-red-600 text-[11px] font-medium border border-red-100"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Parent Note */}
      {feedback.parentNote && (
        <div className="mt-2 px-3 py-2 rounded-lg bg-neutral-50 border border-neutral-100">
          <span className="text-[11px] text-neutral-500 font-medium">부모 메모:</span>
          <p className="text-xs text-neutral-600 mt-0.5">{feedback.parentNote}</p>
        </div>
      )}
    </div>
  );
}

// ─── AI Digest Tab ───────────────────────────────────────────────────────────

function DigestTab({ childId }: { childId: string }) {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const { data: digests, isLoading: digestsLoading } = useFeedbackDigests(childId, 4);
  const generateDigest = useGenerateFeedbackDigest(childId);

  const filteredDigests = useMemo(() => {
    if (!digests) return [];
    if (!fromDate && !toDate) return digests;
    return digests.filter((d) => {
      const start = d.periodStart.split('T')[0];
      if (fromDate && start < fromDate) return false;
      if (toDate && start > toDate) return false;
      return true;
    });
  }, [digests, fromDate, toDate]);

  return (
    <div className="space-y-5">
      {/* Header + Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold text-neutral-800 flex items-center gap-2">
          <span>🤖</span> AI 주간 요약
        </h2>
        <button
          onClick={() => generateDigest.mutate()}
          disabled={generateDigest.isPending}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[#5B8A72] bg-[#5B8A72]/[0.08] hover:bg-[#5B8A72]/[0.15] disabled:opacity-50 transition-all min-h-[44px]"
        >
          {generateDigest.isPending ? '생성 중...' : '+ AI 요약 생성'}
        </button>
      </div>

      {/* Date Range Filter */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-white rounded-xl border border-[#e8e4df]">
        <span className="text-xs text-neutral-500 font-medium">기간 필터:</span>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-[#e8e4df] bg-[#fdfbf7] text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8A72]/30"
        />
        <span className="text-neutral-400 text-sm">~</span>
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-[#e8e4df] bg-[#fdfbf7] text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8A72]/30"
        />
        {(fromDate || toDate) && (
          <button
            onClick={() => {
              setFromDate('');
              setToDate('');
            }}
            className="px-3 py-1.5 rounded-lg text-xs text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            초기화
          </button>
        )}
      </div>

      {/* Digest Loading */}
      {digestsLoading && (
        <div className="bg-white rounded-2xl border border-[#e8e4df] p-12 text-center">
          <div className="text-2xl mb-2 animate-pulse">🤖</div>
          <p className="text-sm text-neutral-400">로딩 중...</p>
        </div>
      )}

      {/* Empty */}
      {!digestsLoading && filteredDigests.length === 0 && (
        <div className="bg-white rounded-2xl border border-[#e8e4df] p-12 text-center shadow-[0_2px_16px_rgba(91,138,114,0.06)]">
          <div className="text-3xl mb-2">🤖</div>
          <p className="text-sm font-medium text-neutral-500">아직 AI 요약이 없습니다</p>
          <p className="text-xs text-neutral-400 mt-1">
            피드백을 기록한 후 'AI 요약 생성' 버튼을 눌러보세요
          </p>
        </div>
      )}

      {/* Digest Cards */}
      {filteredDigests.map((digest: FeedbackDigest) => (
        <DigestCard key={digest.id} digest={digest} />
      ))}
    </div>
  );
}

function DigestCard({ digest }: { digest: FeedbackDigest }) {
  return (
    <div className="bg-white rounded-2xl border border-[#e8e4df] p-6 shadow-[0_2px_16px_rgba(91,138,114,0.06)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 rounded-lg bg-[#5B8A72]/[0.08] text-[#5B8A72] text-xs font-bold">
            {digest.weekKey}
          </span>
          <span className="text-xs text-neutral-400">
            {formatDate(digest.periodStart)} ~ {formatDate(digest.periodEnd)}
          </span>
        </div>
        <span className="text-xs text-neutral-400">피드백 {digest.feedbackCount}건 기반</span>
      </div>

      {/* Summary */}
      <p className="text-sm text-neutral-700 leading-relaxed mb-4">{digest.summary}</p>

      {/* Highlights */}
      {digest.highlights.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1">
            <span>✨</span> 주요 성과
          </h4>
          <div className="flex flex-wrap gap-2">
            {digest.highlights.map((h, i) => (
              <span
                key={i}
                className="px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs border border-green-100"
              >
                {h}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Concerns */}
      {digest.concerns.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1">
            <span>⚠️</span> 관심 필요
          </h4>
          <div className="flex flex-wrap gap-2">
            {digest.concerns.map((c, i) => (
              <span
                key={i}
                className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs border border-amber-100"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Behavior Suggestions */}
      {digest.behaviorSuggestions && digest.behaviorSuggestions.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-purple-700 mb-2 flex items-center gap-1">
            <span>💡</span> 행동 개선 제안
          </h4>
          <div className="flex flex-wrap gap-2">
            {digest.behaviorSuggestions.map((s, i) => (
              <span
                key={i}
                className="px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 text-xs border border-purple-100"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* HomeWork Summary */}
      {digest.homeWorkSummary && (
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1">
            <span>📚</span> 가정 과제 요약
          </h4>
          <p className="text-sm text-neutral-600 bg-blue-50 rounded-lg px-4 py-3 border border-blue-100">
            {digest.homeWorkSummary}
          </p>
        </div>
      )}

      {/* By Session Type */}
      {digest.bySessionType && Object.keys(digest.bySessionType).length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-neutral-600 mb-2 flex items-center gap-1">
            <span>📊</span> 수업별 요약
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.entries(digest.bySessionType).map(([type, data]) => {
              const info = data as Record<string, unknown>;
              return (
                <div
                  key={type}
                  className="px-3 py-2 rounded-lg bg-[#fdfbf7] border border-[#e8e4df] text-xs"
                >
                  <span className="font-semibold text-neutral-700">{type}</span>
                  {info && typeof info === 'object' && 'summary' in info && (
                    <span className="text-neutral-500 ml-2">{String(info.summary)}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function SessionFeedbackPage() {
  const { selectedChildId } = useChildStore();
  const [activeTab, setActiveTab] = useState<PageTab>('session');

  if (!selectedChildId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <PageHeader
          title="수업 피드백"
          subtitle="치료 수업 후 피드백을 기록하고 AI 주간 요약을 확인하세요"
        />
        <div className="bg-white rounded-2xl border border-[#e8e4df] p-12 text-center shadow-[0_2px_16px_rgba(91,138,114,0.06)]">
          <div className="text-4xl mb-3">📝</div>
          <p className="text-[15px] text-neutral-600 font-medium">아이를 먼저 선택해주세요</p>
          <p className="text-sm text-neutral-400 mt-1">
            좌측 메뉴에서 아이를 선택하면 수업 피드백을 관리할 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <PageHeader
        title="수업 피드백"
        subtitle="치료 수업 후 피드백을 기록하고 AI 주간 요약을 확인하세요"
      />

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 rounded-2xl bg-neutral-50 border border-neutral-200 w-fit mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 text-sm font-semibold rounded-[11px] transition-all min-h-[44px] ${
              activeTab === tab.key
                ? 'bg-white text-[#5B8A72] shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'session' && <SessionTab childId={selectedChildId} />}
      {activeTab === 'daily' && <DailyTab childId={selectedChildId} />}
      {activeTab === 'digest' && <DigestTab childId={selectedChildId} />}
    </div>
  );
}
