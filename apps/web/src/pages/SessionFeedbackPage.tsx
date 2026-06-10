import { useState } from 'react';
import { useChildStore } from '../stores/child.store.js';
import {
  useSessionFeedbacks,
  useSessionFeedbackStats,
  useDeleteSessionFeedback,
  useFeedbackDigests,
  useGenerateFeedbackDigest,
  type SessionFeedback,
  type FeedbackDigest,
} from '../hooks/use-session-feedbacks.js';
import { SessionFeedbackModal } from '../components/session-feedback/SessionFeedbackModal.js';
import { PageHeader } from '../components/ui/index.js';

type FeedbackTab = 'list' | 'digest';

const TABS: { key: FeedbackTab; label: string }[] = [
  { key: 'list', label: '피드백 목록' },
  { key: 'digest', label: 'AI 주간 요약' },
];

const SESSION_TYPE_FILTERS = [
  '전체',
  'ABA',
  '언어치료',
  '감각통합',
  '작업치료',
  '행동치료',
  '놀이치료',
  '음악치료',
  '미술치료',
  '물리치료',
  '기타',
];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
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

export function SessionFeedbackPage() {
  const { selectedChildId } = useChildStore();
  const [activeTab, setActiveTab] = useState<FeedbackTab>('list');
  const [showModal, setShowModal] = useState(false);
  const [filterType, setFilterType] = useState('전체');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const query = {
    ...(filterType !== '전체' ? { sessionType: filterType } : {}),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
  };

  const { data: feedbacks, isLoading } = useSessionFeedbacks(selectedChildId, query);
  const { data: stats } = useSessionFeedbackStats(selectedChildId);
  const deleteFeedback = useDeleteSessionFeedback(selectedChildId);
  const { data: digests, isLoading: digestsLoading } = useFeedbackDigests(selectedChildId);
  const generateDigest = useGenerateFeedbackDigest(selectedChildId);

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
      <div className="flex items-start justify-between mb-6">
        <PageHeader
          title="수업 피드백"
          subtitle="치료 수업 후 피드백을 기록하고 AI 주간 요약을 확인하세요"
        />
        <button
          onClick={() => setShowModal(true)}
          className="shrink-0 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#5B8A72] hover:bg-[#3d6b54] transition-all min-h-[44px] shadow-[0_2px_8px_rgba(91,138,114,0.2)]"
        >
          + 피드백 추가
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 rounded-2xl bg-neutral-50 border border-neutral-200 w-fit mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 text-sm font-semibold rounded-[11px] transition-all min-h-[44px] ${
              activeTab === tab.key
                ? 'bg-white text-primary-600 shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: 피드백 목록 */}
      {activeTab === 'list' && (
        <div className="space-y-5">
          {/* Stats Row */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white rounded-xl border border-[#e8e4df] p-4 shadow-[0_2px_8px_rgba(91,138,114,0.04)]">
                <div className="text-xs text-neutral-500 mb-1">이번 주</div>
                <div className="text-xl font-bold text-neutral-800">{stats.recentCount}건</div>
              </div>
              <div className="bg-white rounded-xl border border-[#e8e4df] p-4 shadow-[0_2px_8px_rgba(91,138,114,0.04)]">
                <div className="text-xs text-neutral-500 mb-1">평균 만족도</div>
                <div className="text-xl font-bold text-[#5B8A72]">
                  {stats.avgRating ? stats.avgRating.toFixed(1) : '-'}
                  <span className="text-sm ml-0.5">⭐</span>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-[#e8e4df] p-4 shadow-[0_2px_8px_rgba(91,138,114,0.04)]">
                <div className="text-xs text-neutral-500 mb-1">전체</div>
                <div className="text-xl font-bold text-neutral-800">{stats.total}건</div>
              </div>
              <div className="bg-white rounded-xl border border-[#e8e4df] p-4 shadow-[0_2px_8px_rgba(91,138,114,0.04)]">
                <div className="text-xs text-neutral-500 mb-1">수업 유형</div>
                <div className="text-xl font-bold text-neutral-800">
                  {Object.keys(stats.bySessionType).length}종
                </div>
              </div>
            </div>
          )}

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-xl border border-[#e8e4df]">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 rounded-lg border border-[#e8e4df] bg-[#fdfbf7] text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8A72]/30"
            >
              {SESSION_TYPE_FILTERS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="시작일"
              className="px-3 py-2 rounded-lg border border-[#e8e4df] bg-[#fdfbf7] text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8A72]/30"
            />
            <span className="text-neutral-400 text-sm">~</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="종료일"
              className="px-3 py-2 rounded-lg border border-[#e8e4df] bg-[#fdfbf7] text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8A72]/30"
            />
            {(filterType !== '전체' || startDate || endDate) && (
              <button
                onClick={() => {
                  setFilterType('전체');
                  setStartDate('');
                  setEndDate('');
                }}
                className="px-3 py-2 rounded-lg text-xs text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
              >
                초기화
              </button>
            )}
          </div>

          {/* Feedback Cards */}
          <div className="space-y-3">
            {isLoading && (
              <div className="bg-white rounded-2xl border border-[#e8e4df] p-12 text-center">
                <div className="text-2xl mb-2 animate-pulse">📝</div>
                <p className="text-sm text-neutral-400">로딩 중...</p>
              </div>
            )}

            {!isLoading && (!feedbacks || feedbacks.length === 0) && (
              <div className="bg-white rounded-2xl border border-[#e8e4df] p-12 text-center shadow-[0_2px_16px_rgba(91,138,114,0.06)]">
                <div className="text-3xl mb-2">📝</div>
                <p className="text-sm font-medium text-neutral-500">아직 피드백이 없습니다</p>
                <p className="text-xs text-neutral-400 mt-1">
                  '+ 피드백 추가' 버튼을 눌러 수업 피드백을 기록해보세요
                </p>
              </div>
            )}

            {feedbacks?.map((feedback: SessionFeedback) => (
              <div
                key={feedback.id}
                className="bg-white rounded-xl border border-[#e8e4df] p-5 shadow-[0_2px_8px_rgba(91,138,114,0.04)] hover:shadow-[0_4px_16px_rgba(91,138,114,0.08)] transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-lg bg-[#e8f5ee] text-[#3d6b54] text-xs font-semibold">
                      {feedback.sessionType}
                    </span>
                    <span className="text-xs text-neutral-400">
                      {formatDate(feedback.sessionDate)}
                    </span>
                    {feedback.schedule && (
                      <span className="text-xs text-neutral-400 px-2 py-0.5 rounded bg-neutral-50">
                        📅 {feedback.schedule.title}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm('이 피드백을 삭제하시겠습니까?')) {
                        deleteFeedback.mutate(feedback.id);
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

                {/* Progress / Challenges chips */}
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

                {/* Meta info */}
                {(feedback.therapistName || feedback.institution || feedback.durationMin) && (
                  <div className="mt-3 pt-3 border-t border-neutral-100 flex flex-wrap gap-3 text-xs text-neutral-400">
                    {feedback.therapistName && <span>👤 {feedback.therapistName}</span>}
                    {feedback.institution && <span>🏢 {feedback.institution}</span>}
                    {feedback.durationMin && <span>⏱️ {feedback.durationMin}분</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: AI 주간 요약 */}
      {activeTab === 'digest' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
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

          {digestsLoading && (
            <div className="bg-white rounded-2xl border border-[#e8e4df] p-12 text-center">
              <div className="text-2xl mb-2 animate-pulse">🤖</div>
              <p className="text-sm text-neutral-400">로딩 중...</p>
            </div>
          )}

          {!digestsLoading && (!digests || digests.length === 0) && (
            <div className="bg-white rounded-2xl border border-[#e8e4df] p-12 text-center shadow-[0_2px_16px_rgba(91,138,114,0.06)]">
              <div className="text-3xl mb-2">🤖</div>
              <p className="text-sm font-medium text-neutral-500">아직 AI 요약이 없습니다</p>
              <p className="text-xs text-neutral-400 mt-1">
                피드백을 기록한 후 'AI 요약 생성' 버튼을 눌러보세요
              </p>
            </div>
          )}

          {digests?.map((digest: FeedbackDigest) => (
            <div
              key={digest.id}
              className="bg-white rounded-2xl border border-[#e8e4df] p-6 shadow-[0_2px_16px_rgba(91,138,114,0.06)]"
            >
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
                <span className="text-xs text-neutral-400">
                  피드백 {digest.feedbackCount}건 기반
                </span>
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
          ))}
        </div>
      )}

      <SessionFeedbackModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}
