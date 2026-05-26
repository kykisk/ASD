import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  phone: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

interface UpdateProfileInput {
  name?: string;
  phone?: string | null;
}

export function useProfile() {
  return useQuery<UserProfile>({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await api.get('/users/me');
      return data.data as UserProfile;
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateProfileInput) => {
      const { data } = await api.patch('/users/me', input);
      return data.data as UserProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function useDataExport() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.get('/users/me/export');
      return data.data;
    },
  });
}
