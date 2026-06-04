import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export interface RoleAssignment {
  id: string;
  assignedTo: string;
  childId?: string;
  title: string;
  description?: string;
  date: string;
  completedAt?: string;
  user?: { id: string; name: string; email: string };
  child?: { id: string; name: string };
}

export interface ActivityComment {
  id: string;
  activityLogId: string;
  userId: string;
  content: string;
  createdAt: string;
  user?: { id: string; name: string };
}

interface AssignRoleInput {
  assignedTo: string;
  childId?: string;
  title: string;
  description?: string;
  date: string;
}

export function useRoleAssignments(familyId: string | null | undefined, date: string) {
  return useQuery({
    queryKey: ['collaboration', 'roles', familyId, date],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: RoleAssignment[] }>(
        `/families/${familyId}/roles?date=${date}`,
      );
      return data.data;
    },
    enabled: !!familyId,
  });
}

export function useAssignRole(familyId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AssignRoleInput) => {
      const { data } = await api.post<{ success: true; data: RoleAssignment }>(
        `/families/${familyId}/roles`,
        input,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaboration', 'roles'] });
    },
  });
}

export function useCompleteRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roleId: string) => {
      await api.patch(`/roles/${roleId}/complete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaboration', 'roles'] });
    },
  });
}

export function useActivityComments(activityLogId: string | null | undefined) {
  return useQuery({
    queryKey: ['collaboration', 'comments', activityLogId],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: ActivityComment[] }>(
        `/activity-logs/${activityLogId}/comments`,
      );
      return data.data;
    },
    enabled: !!activityLogId,
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ activityLogId, content }: { activityLogId: string; content: string }) => {
      const { data } = await api.post<{ success: true; data: ActivityComment }>(
        `/activity-logs/${activityLogId}/comments`,
        { content },
      );
      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['collaboration', 'comments', variables.activityLogId],
      });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string) => {
      await api.delete(`/activity-comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaboration', 'comments'] });
    },
  });
}
