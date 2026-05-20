import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export interface Family {
  id: string;
  name: string;
  createdAt: string;
  members: FamilyMember[];
}

export interface FamilyMember {
  id: string;
  userId: string;
  familyId: string;
  role: 'FAMILY_ADMIN' | 'FAMILY_MEMBER';
  user: {
    id: string;
    email: string;
    name: string;
  };
}

interface CreateFamilyInput {
  name: string;
}

interface InviteMemberInput {
  email: string;
  role: 'FAMILY_ADMIN' | 'FAMILY_MEMBER';
}

interface UpdateMemberInput {
  role: 'FAMILY_ADMIN' | 'FAMILY_MEMBER';
}

export function useMyFamily() {
  return useQuery({
    queryKey: ['family', 'my'],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: Family }>(
        '/families/my',
      );
      return data.data;
    },
    retry: false,
  });
}

export function useCreateFamily() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateFamilyInput) => {
      const { data } = await api.post<{ success: true; data: Family }>(
        '/families',
        input,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family'] });
    },
  });
}

export function useInviteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      familyId,
      input,
    }: {
      familyId: string;
      input: InviteMemberInput;
    }) => {
      const { data } = await api.post<{ success: true; data: FamilyMember }>(
        `/families/${familyId}/members`,
        input,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family'] });
    },
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      familyId,
      memberId,
      input,
    }: {
      familyId: string;
      memberId: string;
      input: UpdateMemberInput;
    }) => {
      const { data } = await api.patch<{ success: true; data: FamilyMember }>(
        `/families/${familyId}/members/${memberId}`,
        input,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family'] });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      familyId,
      memberId,
    }: {
      familyId: string;
      memberId: string;
    }) => {
      await api.delete(`/families/${familyId}/members/${memberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family'] });
    },
  });
}
