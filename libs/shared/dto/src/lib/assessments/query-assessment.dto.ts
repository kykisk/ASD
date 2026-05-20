import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const queryAssessmentSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type QueryAssessmentInput = z.input<typeof queryAssessmentSchema>;
export type QueryAssessmentOutput = z.output<typeof queryAssessmentSchema>;

export class QueryAssessmentDto extends createZodDto(queryAssessmentSchema) {}
