import { z } from 'zod';

export const authUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: z.enum(['SYSTEM_ADMIN', 'FAMILY_ADMIN', 'FAMILY_MEMBER', 'THERAPIST']),
  familyId: z.string().nullable(),
  /** 임시 비밀번호로 로그인했으면 true — 앱이 비밀번호 변경 화면으로 보냄 */
  mustChangePassword: z.boolean().optional(),
});

export const authResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  user: authUserSchema,
});

export type AuthUser = z.infer<typeof authUserSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
