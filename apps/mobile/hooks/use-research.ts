import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';

export interface ResearchArticle {
  pubmedId: string;
  title: string;
  journal: string;
  publishedAt: string;
  abstract: string | null;
  koreanSummary: string | null;
  keyFindings: string[] | null;
  tags: string[] | null;
}

export interface ResearchMatch {
  id: string;
  articleId: string;
  isBookmarked: boolean;
  isRead: boolean;
  score: number;
  article: ResearchArticle;
}

interface PaginatedResponse {
  items: ResearchMatch[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export function useResearchFeed() {
  return useQuery<ResearchMatch[]>({
    queryKey: ['research', 'feed'],
    queryFn: async () => {
      const { data } = await api.get('/research/feed');
      const payload = data.data as PaginatedResponse | ResearchMatch[];
      if (Array.isArray(payload)) return payload;
      return payload.items;
    },
  });
}

export function useResearchFeedSearch(search: string) {
  const query = useQuery<PaginatedResponse>({
    queryKey: ['research', 'feed', 'search', search],
    queryFn: async () => {
      const { data } = await api.get(
        `/research/feed?search=${encodeURIComponent(search)}&limit=20`,
      );
      const payload = data.data as PaginatedResponse | ResearchMatch[];
      if (Array.isArray(payload)) {
        return { items: payload, total: payload.length, offset: 0, limit: 20, hasMore: false };
      }
      return payload;
    },
    enabled: search.length > 0,
  });

  return {
    items: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    hasMore: query.data?.hasMore ?? false,
    isLoading: query.isLoading,
  };
}

export function useResearchPagination() {
  const [items, setItems] = useState<ResearchMatch[]>([]);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const reset = useCallback(
    (initialItems: ResearchMatch[], initialTotal: number, initialHasMore: boolean) => {
      setItems(initialItems);
      setTotal(initialTotal);
      setHasMore(initialHasMore);
      setOffset(initialItems.length);
    },
    [],
  );

  const loadMore = useCallback(
    async (search?: string) => {
      if (isLoadingMore || !hasMore) return;
      setIsLoadingMore(true);
      try {
        const params = new URLSearchParams({ limit: '20', offset: String(offset) });
        if (search) params.set('search', search);
        const { data } = await api.get(`/research/feed?${params.toString()}`);
        const payload = data.data as PaginatedResponse | ResearchMatch[];
        if (Array.isArray(payload)) {
          setItems((prev) => [...prev, ...payload]);
          setHasMore(false);
        } else {
          setItems((prev) => [...prev, ...payload.items]);
          setHasMore(payload.hasMore);
          setTotal(payload.total);
          setOffset((prev) => prev + payload.items.length);
        }
      } finally {
        setIsLoadingMore(false);
      }
    },
    [isLoadingMore, hasMore, offset],
  );

  return { items, total, hasMore, isLoadingMore, loadMore, reset };
}

export function useBookmarkArticle() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (articleId) => {
      await api.post(`/research/${articleId}/bookmark`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['research', 'feed'] });
    },
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (articleId) => {
      await api.post(`/research/${articleId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['research', 'feed'] });
    },
  });
}

export interface AiDigestResult {
  digest: string;
  topArticles: { pubmedId: string; title: string; reason: string }[];
  generatedAt: string;
}

export interface DigestHistoryItem {
  id: string;
  digest: string;
  topArticles: { pubmedId: string; title: string; reason: string }[];
  createdAt: string;
}

export function useGenerateAiDigest() {
  const queryClient = useQueryClient();
  return useMutation<AiDigestResult, Error, string>({
    mutationFn: async (childId) => {
      const { data } = await api.post(`/research/ai-digest?childId=${childId}`);
      return data.data as AiDigestResult;
    },
    onSuccess: (_data, childId) => {
      queryClient.invalidateQueries({ queryKey: ['research', 'digests', childId] });
    },
  });
}

export function useDigestHistory(childId: string | null) {
  return useQuery<DigestHistoryItem[]>({
    queryKey: ['research', 'digests', childId],
    queryFn: async () => {
      const { data } = await api.get(`/research/digests?childId=${childId}`);
      return data.data as DigestHistoryItem[];
    },
    enabled: !!childId,
  });
}
