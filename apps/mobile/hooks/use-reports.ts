import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api.js';

interface ReportResult {
  year: number;
  month: number;
  format: string;
  html: string;
  hasPdf: boolean;
}

export function useGenerateReport() {
  return useMutation({
    mutationFn: async ({
      childId,
      year,
      month,
    }: {
      childId: string;
      year: number;
      month: number;
    }) => {
      const { data } = await api.post(`/children/${childId}/reports/monthly`, {
        year,
        month,
      });
      return data.data as ReportResult;
    },
  });
}
