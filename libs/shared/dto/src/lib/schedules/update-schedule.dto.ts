import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { createScheduleSchema } from './create-schedule.dto.js';

export const updateScheduleSchema = createScheduleSchema.partial().extend({
  editMode: z.enum(['THIS_ONLY', 'ALL']).default('ALL'),
  occurrenceDate: z.string().optional(),
});

export type UpdateScheduleInput = z.input<typeof updateScheduleSchema>;
export type UpdateScheduleOutput = z.output<typeof updateScheduleSchema>;

export class UpdateScheduleDto extends createZodDto(updateScheduleSchema) {}
