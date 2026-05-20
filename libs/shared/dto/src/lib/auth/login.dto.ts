import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { emailSchema } from '@auticare/validators';

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, '비밀번호를 입력해주세요'),
});

export type LoginInput = z.input<typeof loginSchema>;
export type LoginOutput = z.output<typeof loginSchema>;

export class LoginDto extends createZodDto(loginSchema) {}
