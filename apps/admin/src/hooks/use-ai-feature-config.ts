import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../services/api';

export interface AiFeatureMapping {
  feature: string;
  configId: string | null;
}

export function useAiFeatureConfig() {
  return useQuery({
    queryKey: ['ai-feature-config'],
    queryFn: async () => {
      const { data } = await adminApi.get<{ success: true; data: AiFeatureMapping[] } | AiFeatureMapping[]>(
        '/admin/ai-config/feature-config',
      );
      return Array.isArray(data) ? data : (data as any).data ?? data;
    },
  });
}

export function useSaveAiFeatureConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (mappings: AiFeatureMapping[]) => {
      await adminApi.put('/admin/ai-config/feature-config', { mappings });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-feature-config'] });
    },
  });
}
