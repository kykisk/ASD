import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const queryScheduleSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  category: z.enum(['THERAPY', 'EDUCATION', 'FREE_PLAY', 'MEAL', 'SLEEP', 'OTHER']).optional(),
});

export type QueryScheduleInput = z.input<typeof queryScheduleSchema>;
export type QueryScheduleOutput = z.output<typeof queryScheduleSchema>;

export class QueryScheduleDto extends createZodDto(queryScheduleSchema) {}
