import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';

export interface ResearchMatch {
  id: string;
  title: string;
  journal: string;
  publishedDate: string;
  tags: string[];
  koreanSummary: string;
  keyFindings: string[];
  relevanceScore: number;
  isBookmarked: boolean;
  isRead: boolean;
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

  return useMutation<void, Error, { articleId: string; bookmarked: boolean }>({
    mutationFn: async ({ articleId, bookmarked }) => {
      if (bookmarked) {
        await api.post(`/research/${articleId}/bookmark`);
      } else {
        await api.delete(`/research/${articleId}/bookmark`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['research', 'feed'] });
    },
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { articleId: string }>({
    mutationFn: async ({ articleId }) => {
      await api.post(`/research/${articleId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['research', 'feed'] });
    },
  });
}
