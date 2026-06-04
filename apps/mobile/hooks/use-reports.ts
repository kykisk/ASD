import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';

interface ReportResult {
  year: number;
  month: number;
  format: string;
  html: string;
  hasPdf: boolean;
}

export interface ReportListItem {
  id: string;
  year: number;
  month: number;
  createdAt: string;
}

export function useReports(childId: string | null) {
  return useQuery<ReportListItem[]>({
    queryKey: ['reports', childId],
    queryFn: async () => {
      const { data } = await api.get(`/children/${childId}/reports`);
      return data.data as ReportListItem[];
    },
    enabled: !!childId,
  });
}

export function useGenerateReport() {
  const queryClient = useQueryClient();

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
      const { data } = await api.post(`/children/${childId}/reports/monthly`, { year, month });
      return data.data as ReportResult;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reports', variables.childId] });
    },
  });
}

export function getReportUrl(reportId: string): string {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3100/v1';
  return `${baseUrl}/reports/${reportId}`;
}
