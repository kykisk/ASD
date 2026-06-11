import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export interface ResearchArticle {
  pubmedId: string;
  title: string;
  authors: string[];
  journal: string;
  publishedAt: string;
  abstract?: string;
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

export interface ArchivedMatch extends ResearchMatch {
  isArchived: boolean;
}

export function useResearchFeed(childId?: string | null, search?: string, limit = 20) {
  return useQuery({
    queryKey: ['research', 'feed', childId, search, limit],
    staleTime: 0,
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (childId) sp.set('childId', childId);
      if (search) sp.set('search', search);
      sp.set('limit', String(limit));
      const { data } = await api.get<{ success: true; data: ResearchMatch[] }>(
        `/research/feed${sp.toString() ? `?${sp.toString()}` : ''}`,
      );
      return (data.data ?? []) as ResearchMatch[];
    },
  });
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
