import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { passwordSchema } from '@auticare/validators';

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '현재 비밀번호를 입력해주세요'),
  newPassword: passwordSchema,
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export class ChangePasswordDto extends createZodDto(changePasswordSchema) {}
