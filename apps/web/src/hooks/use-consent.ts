import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

interface ConsentCheck {
  hasConsented: boolean;
  consentedAt: string | null;
  version: string;
}

interface RecordConsentInput {
  type: string;
  version: string;
}

export function useConsentCheck(type: string | null, version: string | null) {
  return useQuery({
    queryKey: ['consent', type, version],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: ConsentCheck }>(
        `/consent/check`,
        { params: { type, version } },
      );
      return data.data;
    },
    enabled: !!type && !!version,
  });
}

export function useRecordConsent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RecordConsentInput) => {
      const { data } = await api.post<{ success: true; data: { consentedAt: string } }>(
        `/consent`,
        input,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consent'] });
    },
  });
}
