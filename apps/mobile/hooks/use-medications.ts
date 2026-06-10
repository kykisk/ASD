import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';

export interface Medication {
  id: string;
  childId: string;
  familyId: string;
  name: string;
  dosage: string | null;
  method: string | null;
  prescribedBy: string | null;
  startDate: string | null;
  endDate: string | null;
  frequency: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface MedicationLog {
  id: string;
  medicationId: string;
  childId: string;
  logDate: string;
  taken: boolean;
  takenAt: string | null;
  skippedReason: string | null;
  medication: { id: string; name: string; dosage: string | null };
}

export interface MedicationSummary {
  medicationId: string;
  name: string;
  dosage: string | null;
  isActive: boolean;
  adherence: { total: number; taken: number; skipped: number; adherenceRate: number };
  reactions: {
    count: number;
    avgMoodScore: number | null;
    sideEffectCounts: Record<string, number>;
    hasAnySideEffect: boolean;
  };
}

export interface CreateMedicationInput {
  name: string;
  dosage?: string | null;
  method?: string | null;
  prescribedBy?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  frequency?: string | null;
  notes?: string | null;
}

export interface UpdateMedicationInput {
  name?: string;
  dosage?: string | null;
  method?: string | null;
  prescribedBy?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  frequency?: string | null;
  notes?: string | null;
  isActive?: boolean;
}

export interface UpsertMedicationLogInput {
  logDate: string;
  taken: boolean;
  takenAt?: string | null;
  skippedReason?: string | null;
}

export function useMedications(childId: string | null, activeOnly?: boolean) {
  return useQuery<Medication[]>({
    queryKey: ['medications', childId, activeOnly],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeOnly != null) params.set('activeOnly', String(activeOnly));
      const qs = params.toString();
      const url = `/children/${childId}/medications${qs ? `?${qs}` : ''}`;
      const { data } = await api.get(url);
      return data.data as Medication[];
    },
    enabled: !!childId,
  });
}

export function useCreateMedication(childId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMedicationInput) => {
      const { data } = await api.post(`/children/${childId}/medications`, input);
      return data.data as Medication;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications', childId] });
    },
  });
}

export function useUpdateMedication(childId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      medicationId,
      input,
    }: {
      medicationId: string;
      input: UpdateMedicationInput;
    }) => {
      const { data } = await api.patch(`/medications/${medicationId}`, input);
      return data.data as Medication;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications', childId] });
      queryClient.invalidateQueries({ queryKey: ['medication-summary', childId] });
    },
  });
}

export function useDeleteMedication(childId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (medicationId: string) => {
      await api.patch(`/medications/${medicationId}`, { isActive: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications', childId] });
      queryClient.invalidateQueries({ queryKey: ['medication-summary', childId] });
    },
  });
}

export function useMedicationLogs(childId: string | null, from?: string, to?: string) {
  return useQuery<MedicationLog[]>({
    queryKey: ['medication-logs', childId, from, to],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const qs = params.toString();
      const url = `/children/${childId}/medication-logs${qs ? `?${qs}` : ''}`;
      const { data } = await api.get(url);
      return data.data as MedicationLog[];
    },
    enabled: !!childId,
  });
}

export function useUpsertMedicationLog(childId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      medicationId,
      input,
    }: {
      medicationId: string;
      input: UpsertMedicationLogInput;
    }) => {
      const { data } = await api.post(`/medications/${medicationId}/logs`, input);
      return data.data as MedicationLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medication-logs', childId] });
      queryClient.invalidateQueries({ queryKey: ['medication-summary', childId] });
    },
  });
}

export function useMedicationSummary(childId: string | null, from?: string, to?: string) {
  return useQuery<MedicationSummary[]>({
    queryKey: ['medication-summary', childId, from, to],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const qs = params.toString();
      const url = `/children/${childId}/medication-summary${qs ? `?${qs}` : ''}`;
      const { data } = await api.get(url);
      return data.data as MedicationSummary[];
    },
    enabled: !!childId && !!from && !!to,
  });
}
