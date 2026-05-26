import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';

interface FamilyMember {
  id: string;
  userId: string;
  familyId: string;
  role: 'FAMILY_ADMIN' | 'FAMILY_MEMBER';
  createdAt: string;
  user: { id: string; email: string; name: string };
}

interface Family {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  members: FamilyMember[];
}

export function useFamily(familyId: string | null | undefined) {
  return useQuery<Family>({
    queryKey: ['family', familyId],
    queryFn: async () => {
      const { data } = await api.get(`/families/${familyId}`);
      return data.data as Family;
    },
    enabled: !!familyId,
  });
}
