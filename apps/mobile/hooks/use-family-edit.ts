import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';

export function useUpdateFamily(familyId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const { data } = await api.patch(`/families/${familyId}`, { name });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family', familyId] });
    },
  });
}

export function useInviteMember(familyId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      email,
      role,
    }: {
      email: string;
      role: 'FAMILY_ADMIN' | 'FAMILY_MEMBER';
    }) => {
      const { data } = await api.post(`/families/${familyId}/members`, { email, role });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family', familyId] });
    },
  });
}

export function useUpdateMemberRole(familyId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      memberId,
      role,
    }: {
      memberId: string;
      role: 'FAMILY_ADMIN' | 'FAMILY_MEMBER';
    }) => {
      const { data } = await api.patch(`/families/${familyId}/members/${memberId}`, { role });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family', familyId] });
    },
  });
}

export function useRemoveMember(familyId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: string) => {
      await api.delete(`/families/${familyId}/members/${memberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family', familyId] });
    },
  });
}
