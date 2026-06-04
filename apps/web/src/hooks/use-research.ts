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

export function useResearchFeed(childId?: string | null) {
  return useQuery({
    queryKey: ['research', 'feed', childId],
    staleTime: 0,
    queryFn: async () => {
      const params = childId ? `?childId=${childId}` : '';
      const { data } = await api.get<{ success: true; data: ResearchMatch[] }>(
        `/research/feed${params}`,
      );
      return data.data;
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
