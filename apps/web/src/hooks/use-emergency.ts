import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export interface EmergencyGuide {
  title: string;
  steps: string[];
  breathingGuide: { inhale: number; hold: number; exhale: number };
  calmTimerSec: number;
}

export interface EmergencyEvent {
  id: string;
  type: string;
  severity?: string;
  trigger?: string;
  durationMin?: number;
  interventions?: string;
  outcome?: string;
  notes?: string;
  createdAt: string;
}

export interface EmergencyStats {
  totalCount: number;
  last30Days: number;
  byType: Record<string, number>;
}

interface LogEmergencyEventInput {
  type: string;
  severity?: string;
  trigger?: string;
  durationMin?: number;
  interventions?: string;
  outcome?: string;
  notes?: string;
}

export function useEmergencyGuides() {
  return useQuery({
    queryKey: ['emergency', 'guides'],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: Record<string, { title: string }> }>(
        '/emergency/guides',
      );
      return data.data;
    },
  });
}

export function useEmergencyGuide(type: string | null) {
  return useQuery({
    queryKey: ['emergency', 'guide', type],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: EmergencyGuide }>(
        `/emergency/guides/${type}`,
      );
      return data.data;
    },
    enabled: !!type,
  });
}

export function useEmergencyHistory(childId: string | null | undefined) {
  return useQuery({
    queryKey: ['emergency', 'history', childId],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: EmergencyEvent[] }>(
        `/emergency/children/${childId}/events`,
      );
      return data.data;
    },
    enabled: !!childId,
  });
}

export function useEmergencyStats(childId: string | null | undefined) {
  return useQuery({
    queryKey: ['emergency', 'stats', childId],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: EmergencyStats }>(
        `/emergency/children/${childId}/stats`,
      );
      return data.data;
    },
    enabled: !!childId,
  });
}

export function useLogEmergencyEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ childId, input }: { childId: string; input: LogEmergencyEventInput }) => {
      const { data } = await api.post<{ success: true; data: EmergencyEvent }>(
        `/emergency/children/${childId}/events`,
        input,
      );
      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['emergency', 'history', variables.childId] });
      queryClient.invalidateQueries({ queryKey: ['emergency', 'stats', variables.childId] });
    },
  });
}
