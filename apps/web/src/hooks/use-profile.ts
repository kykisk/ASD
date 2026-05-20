import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth.store';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: string;
  familyId: string | null;
}

interface UpdateProfileInput {
  name?: string;
  phone?: string | null;
}

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: UserProfile }>(
        '/users/me',
      );
      return data.data;
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { setAuth, accessToken } = useAuthStore();

  return useMutation({
    mutationFn: async (input: UpdateProfileInput) => {
      const { data } = await api.patch<{ success: true; data: UserProfile }>(
        '/users/me',
        input,
      );
      return data.data;
    },
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      if (accessToken) {
        setAuth(accessToken, {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          role: updatedUser.role,
          familyId: updatedUser.familyId,
        });
      }
    },
  });
}
