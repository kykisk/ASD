import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { koreanNameSchema, phoneSchema } from '@auticare/validators';

export const updateUserSchema = z.object({
  name: koreanNameSchema.optional(),
  phone: phoneSchema,
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export class UpdateUserDto extends createZodDto(updateUserSchema) {}
