import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { emailSchema } from '@auticare/validators';

export const inviteMemberSchema = z.object({
  email: emailSchema,
  role: z.enum(['FAMILY_ADMIN', 'FAMILY_MEMBER']).default('FAMILY_MEMBER'),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export class InviteMemberDto extends createZodDto(inviteMemberSchema) {}
