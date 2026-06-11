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

export function useResearchFeed() {
  return useQuery<ResearchMatch[]>({
    queryKey: ['research', 'feed'],
    queryFn: async () => {
      const { data } = await api.get('/research/feed');
      return data.data as ResearchMatch[];
    },
  });
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
