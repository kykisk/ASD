import { z } from 'zod';

export const authUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: z.enum(['SYSTEM_ADMIN', 'FAMILY_ADMIN', 'FAMILY_MEMBER', 'THERAPIST']),
  familyId: z.string().nullable(),
});

export const authResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  user: authUserSchema,
});

export type AuthUser = z.infer<typeof authUserSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
