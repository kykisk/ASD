import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api.js';

export interface Medication {
  id: string;
  childId: string;
  familyId: string;
  name: string;
  dosage: string | null;
  method: string | null;
  prescribedBy: string | null;
  startDate: string;
  endDate: string | null;
  frequency: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { logs: number; reactions: number };
}

export interface MedicationLog {
  id: string;
  medicationId: string;
  childId: string;
  logDate: string;
  taken: boolean;
  takenAt: string | null;
  skippedReason: string | null;
  createdAt: string;
  medication: { id: string; name: string; dosage: string | null };
}

export interface MedicationReaction {
  id: string;
  medicationId: string;
  childId: string;
  observedAt: string;
  moodScore: number | null;
  notes: string | null;
  sideEffects: string[];
  hasAnySideEffect: boolean;
  createdAt: string;
}

export interface MedicationSummary {
  medicationId: string;
  name: string;
  dosage: string | null;
  isActive: boolean;
  period: { from: string; to: string };
  adherence: {
    total: number;
    taken: number;
    skipped: number;
    adherenceRate: number;
  };
  reactions: {
    count: number;
    avgMoodScore: number | null;
    sideEffectCounts: Record<string, number>;
    hasAnySideEffect: boolean;
    recentNotes: string[];
  };
}

export interface CreateMedicationInput {
  name: string;
  dosage?: string | null;
  method?: string | null;
  prescribedBy?: string | null;
  startDate: string;
  endDate?: string | null;
  frequency?: string | null;
  notes?: string | null;
}

export interface UpdateMedicationInput {
  id: string;
  name?: string;
  dosage?: string | null;
  method?: string | null;
  prescribedBy?: string | null;
  startDate?: string;
  endDate?: string | null;
  frequency?: string | null;
  notes?: string | null;
  isActive?: boolean;
}

export interface UpsertMedicationLogInput {
  medicationId: string;
  logDate: string;
  taken: boolean;
  takenAt?: string | null;
  skippedReason?: string | null;
}

export interface CreateMedicationReactionInput {
  medicationId: string;
  observedAt: string;
  moodScore?: number | null;
  notes?: string | null;
  sideEffects?: string[];
}

export function useMedications(childId: string | null, activeOnly?: boolean) {
  return useQuery({
    queryKey: ['medications', childId, activeOnly],
    queryFn: async () => {
      const params = activeOnly !== undefined ? { activeOnly } : undefined;
      const { data } = await api.get<{ success: true; data: Medication[] }>(
        `/children/${childId}/medications`,
        { params },
      );
      return data.data;
    },
    enabled: !!childId,
  });
}

export function useCreateMedication(childId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMedicationInput) => {
      const { data } = await api.post<{ success: true; data: Medication }>(
        `/children/${childId}/medications`,
        input,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications', childId] });
    },
  });
}

export function useUpdateMedication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateMedicationInput) => {
      const { id, ...body } = input;
      const { data } = await api.patch<{ success: true; data: Medication }>(
        `/medications/${id}`,
        body,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications'] });
    },
  });
}

export function useDeleteMedication(childId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (medicationId: string) => {
      await api.delete(`/medications/${medicationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications', childId] });
    },
  });
}

export function useMedicationLogs(childId: string | null, from?: string, to?: string) {
  return useQuery({
    queryKey: ['medication-logs', childId, from, to],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (from) params.from = from;
      if (to) params.to = to;
      const { data } = await api.get<{ success: true; data: MedicationLog[] }>(
        `/children/${childId}/medication-logs`,
        { params },
      );
      return data.data;
    },
    enabled: !!childId,
  });
}

export function useUpsertMedicationLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpsertMedicationLogInput) => {
      const { medicationId, ...body } = input;
      const { data } = await api.post<{ success: true; data: MedicationLog }>(
        `/medications/${medicationId}/logs`,
        body,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medication-logs'] });
    },
  });
}

export function useMedicationReactions(medicationId: string | null) {
  return useQuery({
    queryKey: ['medication-reactions', medicationId],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: MedicationReaction[] }>(
        `/medications/${medicationId}/reactions`,
      );
      return data.data;
    },
    enabled: !!medicationId,
  });
}

export function useCreateMedicationReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMedicationReactionInput) => {
      const { medicationId, ...body } = input;
      const { data } = await api.post<{ success: true; data: MedicationReaction }>(
        `/medications/${medicationId}/reactions`,
        body,
      );
      return data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['medication-reactions', variables.medicationId] });
      queryClient.invalidateQueries({ queryKey: ['medication-summary'] });
    },
  });
}

export function useMedicationSummary(childId: string | null, from: string, to: string) {
  return useQuery({
    queryKey: ['medication-summary', childId, from, to],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: MedicationSummary[] }>(
        `/children/${childId}/medication-summary`,
        { params: { from, to } },
      );
      return data.data;
    },
    enabled: !!childId && !!from && !!to,
  });
}
