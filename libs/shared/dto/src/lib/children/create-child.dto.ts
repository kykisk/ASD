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
  developmentalLevel: z.object({
    language: z.string().max(500).optional(),
    cognitive: z.string().max(500).optional(),
    motor: z.string().max(500).optional(),
    selfCare: z.string().max(500).optional(),
    social: z.string().max(500).optional(),
    overall: z.string().max(500).optional(),
  }).optional(),
  centerInfo: z.array(z.object({
    name: z.string().min(1).max(100),
    type: z.string().min(1).max(50),
    frequency: z.string().max(50),
    currentGoal: z.string().max(300).optional(),
  })).max(10).optional(),
});

export type CreateChildInput = z.input<typeof createChildSchema>;
export type CreateChildOutput = z.output<typeof createChildSchema>;

export class CreateChildDto extends createZodDto(createChildSchema) {}
