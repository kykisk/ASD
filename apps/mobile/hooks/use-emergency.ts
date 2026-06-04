import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../lib/api.js';

export interface EmergencyGuide {
  title: string;
  steps: string[];
  breathingGuide: {
    inhale: number;
    hold: number;
    exhale: number;
  };
  calmTimerSec: number;
}

export interface EmergencyGuides {
  [type: string]: { title: string; description: string };
}

export interface LogEmergencyEventInput {
  type: string;
  severity: 'MILD' | 'MODERATE' | 'SEVERE';
  trigger?: string;
  notes?: string;
}

export function useEmergencyGuides() {
  return useQuery<EmergencyGuides>({
    queryKey: ['emergency', 'guides'],
    queryFn: async () => {
      const { data } = await api.get('/emergency/guides');
      return data.data as EmergencyGuides;
    },
  });
}

export function useEmergencyGuide(type: string | null) {
  return useQuery<EmergencyGuide>({
    queryKey: ['emergency', 'guide', type],
    queryFn: async () => {
      const { data } = await api.get(`/emergency/guides/${type}`);
      return data.data as EmergencyGuide;
    },
    enabled: !!type,
  });
}

export function useLogEmergencyEvent() {
  return useMutation<void, Error, { childId: string; input: LogEmergencyEventInput }>({
    mutationFn: async ({ childId, input }) => {
      await api.post(`/emergency/children/${childId}/events`, input);
    },
  });
}
