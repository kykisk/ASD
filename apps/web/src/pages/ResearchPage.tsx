import { useState } from 'react';
import { useChildStore } from '../stores/child.store';
import {
  useResearchFeed,
  useBookmarks,
  useBookmarkArticle,
  useMarkAsRead,
  ResearchMatch,
} from '../hooks/use-research';
import { PageHeader, ErrorState, EmptyState, LoadingSpinner } from '../components/ui';

function ArticleCard({ item }: { item: ResearchMatch }) {
  const bookmark = useBookmarkArticle();
  const markRead = useMarkAsRead();

  return (
    <div
      className={`bg-white rounded-xl border border-[#E8E4DF] p-5 transition-all hover:shadow-sage-sm ${item.isRead ? 'opacity-75' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-neutral-800 line-clamp-2">
            {item.article.title}
          </h3>
          <p className="text-xs text-neutral-500 mt-1">
            {item.article.journal} ·{' '}
            {new Date(item.article.publishedAt).toLocaleDateString('ko-KR')}
          </p>
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
        <p className="mt-3 text-sm text-neutral-600 leading-relaxed line-clamp-3">
          {item.article.koreanSummary}
        </p>
      )}

      {item.article.keyFindings && item.article.keyFindings.length > 0 && (
        <ul className="mt-3 space-y-1">
          {item.article.keyFindings.slice(0, 3).map((finding, i) => (
            <li key={i} className="text-xs text-neutral-600 flex gap-1.5">
              <span className="text-primary-500 shrink-0">•</span>
              <span className="line-clamp-1">{finding}</span>
            </li>
          ))}
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
    </div>
  );
}

export function ResearchPage() {
  const { selectedChildId } = useChildStore();
  const [tab, setTab] = useState<'feed' | 'bookmarks'>('feed');

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

  const isLoading = tab === 'feed' ? feedLoading : bmLoading;
  const isError = tab === 'feed' ? feedError : bmError;
  const items = tab === 'feed' ? feed : bookmarks;
  const refetchFn = tab === 'feed' ? refetchFeed : refetchBm;

  if (isLoading) return <LoadingSpinner fullPage />;
  if (isError) return <ErrorState onRetry={() => refetchFn()} />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader title="연구 자료" subtitle="자녀의 프로파일에 맞는 최신 연구를 추천합니다." />

      {/* Tabs */}
      <div className="flex gap-1 bg-neutral-100 rounded-xl p-1">
        <button
          onClick={() => setTab('feed')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
            tab === 'feed'
              ? 'bg-white text-primary-700 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          추천
        </button>
        <button
          onClick={() => setTab('bookmarks')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
            tab === 'bookmarks'
              ? 'bg-white text-primary-700 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          북마크
        </button>
      </div>

      {/* Article List */}
      {items && items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item: ResearchMatch) => (
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
      )}
    </div>
  );
}
