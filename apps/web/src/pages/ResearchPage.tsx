import { useState, useEffect } from 'react';
import { useChildStore } from '../stores/child.store';
import {
  useResearchFeed,
  useBookmarks,
  useBookmarkArticle,
  useMarkAsRead,
  useGenerateAiDigest,
  useArchivedArticles,
  useUnarchiveArticle,
  useDeleteArchived,
  useDigestHistory,
  ResearchMatch,
  AiDigestResult,
  ArchivedMatch,
  DigestHistoryItem,
} from '../hooks/use-research';
import { PageHeader, ErrorState, EmptyState, LoadingSpinner } from '../components/ui';

function DigestHistoryCard({ item }: { item: DigestHistoryItem }) {
  const [expanded, setExpanded] = useState(false);
  const topArticles = item.topArticles as { title: string; reason: string }[];

  return (
    <div className="bg-white rounded-xl border border-[#E8E4DF] overflow-hidden">
      {/* Header — always visible, click to toggle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-neutral-50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-lg shrink-0">✨</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-neutral-800 truncate">
              {new Date(item.createdAt).toLocaleString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              생성
            </p>
            {!expanded && (
              <p className="text-xs text-neutral-500 truncate mt-0.5">
                {item.digest.replace(/\*\*/g, '').replace(/#+\s/g, '').slice(0, 80)}...
              </p>
            )}
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-neutral-400 shrink-0 ml-2 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-neutral-100 space-y-4">
          <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap pt-4">
            {item.digest}
          </p>
          {topArticles.length > 0 && (
            <div className="bg-primary-50 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-primary-700 uppercase tracking-wide">
                TOP 추천 논문
              </p>
              {topArticles.map((a, i) => (
                <div key={i} className="flex gap-2 text-sm">
                  <span className="w-5 h-5 rounded-full bg-primary-500 text-white text-xs flex items-center justify-center font-bold shrink-0">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-medium text-neutral-800 line-clamp-1">{a.title}</p>
                    {a.reason && <p className="text-neutral-500 text-xs mt-0.5">{a.reason}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ArticleCard({ item }: { item: ResearchMatch }) {
  const bookmark = useBookmarkArticle();
  const markRead = useMarkAsRead();
  const [expanded, setExpanded] = useState(false);

  const publishedDate = new Date(item.article.publishedAt);
  const ageYears = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
  const dateLabel = publishedDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });
  const isOld = ageYears > 1.5;

  return (
    <div
      className={`bg-white rounded-xl border border-[#E8E4DF] p-5 transition-all hover:shadow-sage-sm ${item.isRead ? 'opacity-75' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3
            className={`text-sm font-semibold text-neutral-800 ${expanded ? '' : 'line-clamp-2'}`}
          >
            {item.article.title}
          </h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <p className="text-xs text-neutral-500">{item.article.journal}</p>
            <span
              className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                isOld ? 'bg-amber-50 text-amber-600' : 'bg-primary-50 text-primary-600'
              }`}
            >
              📅 {dateLabel}
              {isOld && ' · 1년 이상 전'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => markRead.mutate(item.articleId)}
            className={`p-2 rounded-lg transition-colors ${
              item.isRead
                ? 'text-primary-500 bg-primary-50'
                : 'text-neutral-400 hover:text-primary-500 hover:bg-primary-50'
            }`}
            title={item.isRead ? '읽음' : '읽음으로 표시'}
          >
            <svg
              className="w-4 h-4"
              fill={item.isRead ? 'currentColor' : 'none'}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
          <button
            onClick={() => bookmark.mutate(item.articleId)}
            className={`p-2 rounded-lg transition-colors ${
              item.isBookmarked
                ? 'text-amber-500 bg-amber-50'
                : 'text-neutral-400 hover:text-amber-500 hover:bg-amber-50'
            }`}
            title={item.isBookmarked ? '북마크 해제' : '북마크'}
          >
            <svg
              className="w-4 h-4"
              fill={item.isBookmarked ? 'currentColor' : 'none'}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
              />
            </svg>
          </button>
        </div>
      </div>

      {item.article.koreanSummary && (
        <p
          className={`mt-3 text-sm text-neutral-600 leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}
        >
          {item.article.koreanSummary}
        </p>
      )}

      {expanded && item.article.abstract && !item.article.koreanSummary && (
        <p className="mt-3 text-sm text-neutral-600 leading-relaxed">{item.article.abstract}</p>
      )}

      {item.article.keyFindings && item.article.keyFindings.length > 0 && (
        <ul className="mt-3 space-y-1">
          {(expanded ? item.article.keyFindings : item.article.keyFindings.slice(0, 3)).map(
            (finding, i) => (
              <li key={i} className="text-xs text-neutral-600 flex gap-1.5">
                <span className="text-primary-500 shrink-0">•</span>
                <span className={expanded ? '' : 'line-clamp-1'}>{finding}</span>
              </li>
            ),
          )}
        </ul>
      )}

      {item.article.tags && item.article.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {item.article.tags.slice(0, 4).map((tag, i) => (
            <span
              key={i}
              className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 text-[10px] font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <button
        onClick={() => {
          setExpanded(!expanded);
          if (!item.isRead) markRead.mutate(item.articleId);
        }}
        className="mt-3 flex items-center gap-1 text-xs text-[#5B8A72] font-medium hover:text-[#3d6b54] transition-colors"
      >
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
        {expanded ? '접기' : '전체 내용 보기'}
      </button>
    </div>
  );
}

const DIGEST_STEPS = [
  { delay: 0, icon: '📚', text: '북마크 논문 분석 중...' },
  { delay: 2000, icon: '🧬', text: '아이 프로파일과 매칭 중...' },
  { delay: 5000, icon: '🤖', text: 'AI가 맞춤 요약을 작성하고 있습니다...' },
  { delay: 10000, icon: '✨', text: '거의 완료...' },
];

function DigestProgress() {
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const timers = DIGEST_STEPS.slice(1).map((s, i) =>
      setTimeout(() => setStepIdx(i + 1), s.delay),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const current = DIGEST_STEPS[stepIdx];
  const progress = Math.min(((stepIdx + 1) / DIGEST_STEPS.length) * 100, 95);

  return (
    <div className="px-4 py-4 rounded-xl bg-primary-50 border border-primary-100">
      <div className="flex items-center gap-2.5 mb-3">
        <span className="text-base">{current.icon}</span>
        <span className="text-sm font-medium text-primary-600 transition-all duration-300">
          {current.text}
        </span>
      </div>
      <div className="h-1.5 bg-primary-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary-500 rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export function ResearchPage() {
  const { selectedChildId } = useChildStore();
  const [tab, setTab] = useState<'feed' | 'bookmarks' | 'archived' | 'history'>('feed');
  const [digest, setDigest] = useState<AiDigestResult | null>(null);

  const {
    data: feed,
    isLoading: feedLoading,
    isError: feedError,
    refetch: refetchFeed,
  } = useResearchFeed();
  const {
    data: bookmarks,
    isLoading: bmLoading,
    isError: bmError,
    refetch: refetchBm,
  } = useBookmarks();
  const { data: archived, isLoading: archLoading } = useArchivedArticles();
  const { data: digests, isLoading: digestsLoading } = useDigestHistory(selectedChildId);
  const generateDigest = useGenerateAiDigest();
  const unarchiveMutation = useUnarchiveArticle();
  const deleteArchivedMutation = useDeleteArchived();

  const isLoading =
    tab === 'feed'
      ? feedLoading
      : tab === 'bookmarks'
        ? bmLoading
        : tab === 'archived'
          ? archLoading
          : digestsLoading;
  const isError = tab === 'feed' ? feedError : tab === 'bookmarks' ? bmError : false;
  const refetchFn = tab === 'feed' ? refetchFeed : refetchBm;

  const handleGenerateDigest = async () => {
    if (!selectedChildId) return;
    const result = await generateDigest.mutateAsync(selectedChildId);
    setDigest(result);
  };

  if (isLoading) return <LoadingSpinner fullPage />;
  if (isError) return <ErrorState onRetry={() => refetchFn()} />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="연구 자료"
        subtitle="자녀의 프로파일에 맞는 최신 연구를 추천합니다."
        action={
          selectedChildId ? (
            <button
              onClick={handleGenerateDigest}
              disabled={generateDigest.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 disabled:opacity-60 transition-colors"
            >
              {generateDigest.isPending ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  AI 분석 중...
                </>
              ) : (
                <>✨ AI 맞춤 요약</>
              )}
            </button>
          ) : undefined
        }
      />

      {/* AI Digest Progress */}
      {generateDigest.isPending && <DigestProgress />}

      {/* AI Digest Card */}
      {digest && (
        <div className="bg-gradient-to-br from-primary-50 to-white border border-primary-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-primary-800 flex items-center gap-2">
              ✨ AI 맞춤 연구 요약
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400">
                {new Date(digest.generatedAt).toLocaleString('ko-KR')}
              </span>
              <button
                onClick={() => setDigest(null)}
                className="text-neutral-400 hover:text-neutral-600 text-lg leading-none"
              >
                ×
              </button>
            </div>
          </div>
          <div className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">
            {digest.digest}
          </div>
          {digest.topArticles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-primary-700 uppercase tracking-wide">
                TOP 추천 논문
              </p>
              {digest.topArticles.map((a, i) => (
                <div key={i} className="flex gap-2 text-sm">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-primary-500 text-white text-xs flex items-center justify-center font-bold">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-medium text-neutral-800 line-clamp-1">{a.title}</p>
                    <p className="text-neutral-500 text-xs mt-0.5">{a.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-neutral-100 rounded-xl p-1 flex-wrap">
        {[
          { key: 'feed', label: '추천' },
          { key: 'bookmarks', label: '북마크' },
          { key: 'archived', label: `아카이브${archived?.length ? ` (${archived.length})` : ''}` },
          { key: 'history', label: 'AI 요약 히스토리' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key as typeof tab)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              tab === key
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Feed / Bookmarks */}
      {(tab === 'feed' || tab === 'bookmarks') &&
        ((tab === 'feed' ? feed : bookmarks)?.length ? (
          <div className="space-y-3">
            {(tab === 'feed' ? feed : bookmarks)!.map((item: ResearchMatch) => (
              <ArticleCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <EmptyState
            title={tab === 'feed' ? '추천 논문이 없습니다' : '북마크한 논문이 없습니다'}
            description={
              tab === 'feed'
                ? '매주 자동으로 아이의 프로파일에 맞는 연구를 수집합니다.'
                : '관심 있는 논문을 북마크해보세요.'
            }
          />
        ))}

      {/* Archived */}
      {tab === 'archived' && (
        <div className="space-y-3">
          {archived && archived.length > 0 && (
            <div className="flex justify-end">
              <button
                onClick={() => {
                  if (
                    window.confirm(`아카이브된 논문 ${archived.length}개를 영구 삭제하시겠습니까?`)
                  )
                    deleteArchivedMutation.mutate();
                }}
                disabled={deleteArchivedMutation.isPending}
                className="text-xs text-red-500 hover:text-red-700 px-3 py-1.5 border border-red-200 rounded-lg"
              >
                전체 영구 삭제
              </button>
            </div>
          )}
          {archived?.length ? (
            archived.map((item: ArchivedMatch) => (
              <div
                key={item.id}
                className="bg-neutral-50 rounded-xl border border-neutral-200 p-4 flex items-start justify-between gap-3 opacity-75"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-700 line-clamp-2">
                    {item.article.title}
                  </p>
                  <p className="text-xs text-neutral-400 mt-1">
                    {item.article.journal} ·{' '}
                    {new Date(item.article.publishedAt).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                    })}
                  </p>
                  <p className="text-xs text-amber-500 mt-1">
                    🗃️ {new Date(item.archivedAt).toLocaleDateString('ko-KR')} 보관됨
                  </p>
                </div>
                <button
                  onClick={() => unarchiveMutation.mutate(item.id)}
                  className="text-xs text-primary-600 hover:text-primary-800 px-3 py-1.5 border border-primary-200 rounded-lg shrink-0"
                >
                  복원
                </button>
              </div>
            ))
          ) : (
            <EmptyState
              title="아카이브가 비어있습니다"
              description="90일 이상 된 비북마크 논문이 자동으로 여기에 보관됩니다."
            />
          )}
        </div>
      )}

      {/* Digest History */}
      {tab === 'history' && (
        <div className="space-y-3">
          {digests?.length ? (
            digests.map((d: DigestHistoryItem) => <DigestHistoryCard key={d.id} item={d} />)
          ) : (
            <EmptyState
              title="AI 요약 히스토리가 없습니다"
              description="'✨ AI 맞춤 요약' 버튼을 눌러 요약을 생성하면 여기에 기록됩니다."
            />
          )}
        </div>
      )}
    </div>
  );
}
