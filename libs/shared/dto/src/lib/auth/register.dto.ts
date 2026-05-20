import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { emailSchema, nameSchema, passwordSchema } from '@auticare/validators';

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
});

export type RegisterInput = z.input<typeof registerSchema>;
export type RegisterOutput = z.output<typeof registerSchema>;

export class RegisterDto extends createZodDto(registerSchema) {}
