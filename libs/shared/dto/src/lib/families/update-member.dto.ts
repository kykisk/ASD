import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const updateMemberSchema = z.object({
  role: z.enum(['FAMILY_ADMIN', 'FAMILY_MEMBER']),
});

export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export class UpdateMemberDto extends createZodDto(updateMemberSchema) {}
