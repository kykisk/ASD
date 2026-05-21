import { useMutation } from '@tanstack/react-query';
import { api } from '../services/api';

interface MonthlyReportResult {
  year: number;
  month: number;
  format: 'pdf' | 'html';
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
      const { data } = await api.post<{ success: true; data: MonthlyReportResult }>(
        `/children/${childId}/reports/monthly`,
        { year, month },
      );
      return data.data;
    },
  });
}
