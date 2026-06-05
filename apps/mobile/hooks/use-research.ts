import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';

export interface ResearchArticle {
  pubmedId: string;
  title: string;
  journal: string;
  publishedAt: string;
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
