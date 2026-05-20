import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { koreanNameSchema, dateSchema } from '@auticare/validators';

export const createChildSchema = z.object({
  name: koreanNameSchema,
  birthDate: dateSchema,
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  diagnosisName: z.string().max(100).optional(),
  diagnosisDate: dateSchema.optional(),
  notes: z.string().max(500).optional(),
});

export type CreateChildInput = z.input<typeof createChildSchema>;
export type CreateChildOutput = z.output<typeof createChildSchema>;

export class CreateChildDto extends createZodDto(createChildSchema) {}
