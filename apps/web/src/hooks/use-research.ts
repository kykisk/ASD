import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export interface ResearchArticle {
  pubmedId: string;
  title: string;
  authors: string[];
  journal: string;
  publishedAt: string;
  koreanSummary?: string;
  keyFindings?: string[];
  tags?: string[];
}

export interface ResearchMatch {
  id: string;
  articleId: string;
  score: number;
  isBookmarked: boolean;
  isRead: boolean;
  article: ResearchArticle;
}

export interface AiDigestResult {
  digest: string;
  topArticles: { pubmedId: string; title: string; reason: string }[];
  generatedAt: string;
}

export interface ResearchFeedResponse {
  items: ResearchMatch[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export function useResearchFeed(
  childId?: string | null,
  params?: { search?: string; limit?: number; offset?: number },
) {
  return useQuery({
    queryKey: ['research', 'feed', childId, params?.search, params?.limit, params?.offset],
    staleTime: 0,
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (childId) searchParams.set('childId', childId);
      if (params?.search) searchParams.set('search', params.search);
      if (params?.limit != null) searchParams.set('limit', String(params.limit));
      if (params?.offset != null) searchParams.set('offset', String(params.offset));
      const qs = searchParams.toString();
      const { data } = await api.get<{ success: true; data: ResearchFeedResponse }>(
        `/research/feed${qs ? `?${qs}` : ''}`,
      );
      return data.data.items;
    },
  });
}

export function useResearchFeedPaginated(search?: string, limit = 20) {
  const [items, setItems] = useState<ResearchMatch[]>([]);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const fetchPage = useCallback(
    async (pageOffset: number, append: boolean) => {
      setIsLoading(true);
      try {
        const searchParams = new URLSearchParams();
        if (search) searchParams.set('search', search);
        searchParams.set('limit', String(limit));
        searchParams.set('offset', String(pageOffset));
        const qs = searchParams.toString();
        const { data } = await api.get<{ success: true; data: ResearchFeedResponse }>(
          `/research/feed?${qs}`,
        );
        const result = data.data;
        setTotal(result.total);
        setHasMore(result.hasMore);
        setOffset(pageOffset + result.items.length);
        if (append) {
          setItems((prev) => [...prev, ...result.items]);
        } else {
          setItems(result.items);
        }
      } finally {
        setIsLoading(false);
        setIsInitialLoading(false);
      }
    },
    [search, limit],
  );

  const resetAndFetch = useCallback(() => {
    setItems([]);
    setOffset(0);
    setTotal(0);
    setHasMore(false);
    setIsInitialLoading(true);
    fetchPage(0, false);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchPage(offset, true);
    }
  }, [isLoading, hasMore, offset, fetchPage]);

  return { items, total, hasMore, loadMore, isLoading, isInitialLoading, resetAndFetch };
}

export function useBookmarks() {
  return useQuery({
    queryKey: ['research', 'bookmarks'],
    staleTime: 0,
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: ResearchMatch[] }>(
        '/research/bookmarks',
      );
      return data.data;
    },
  });
}

export function useBookmarkArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (articleId: string) => {
      await api.post(`/research/${articleId}/bookmark`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['research'] });
    },
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (articleId: string) => {
      await api.post(`/research/${articleId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['research'] });
    },
  });
}

export function useGenerateAiDigest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (childId: string) => {
      const { data } = await api.post<{ success: true; data: AiDigestResult }>(
        `/research/ai-digest?childId=${childId}`,
      );
      return data.data;
    },
    onSuccess: (_data, childId) => {
      queryClient.invalidateQueries({ queryKey: ['research', 'digests', childId] });
    },
  });
}

export interface ArchivedMatch {
  id: string;
  articleId: string;
  archivedAt: string;
  article: {
    pubmedId: string;
    title: string;
    journal: string;
    publishedAt: string;
    tags?: string[];
  };
}

export interface DigestHistoryItem {
  id: string;
  digest: string;
  topArticles: { pubmedId: string; title: string; reason: string }[];
  createdAt: string;
}

export function useArchivedArticles() {
  return useQuery({
    queryKey: ['research', 'archived'],
    staleTime: 0,
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: ArchivedMatch[] }>(
        '/research/archived',
      );
      return data.data;
    },
  });
}

export function useUnarchiveArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (matchId: string) => {
      await api.patch(`/research/matches/${matchId}/unarchive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['research'] });
    },
  });
}

export function useDeleteArchived() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.delete<{ success: true; data: { deleted: number } }>(
        '/research/archived',
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['research'] });
    },
  });
}

export function useDigestHistory(childId?: string | null) {
  return useQuery({
    queryKey: ['research', 'digests', childId],
    staleTime: 0,
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: DigestHistoryItem[] }>(
        `/research/digests?childId=${childId}`,
      );
      return data.data;
    },
    enabled: !!childId,
  });
}
