import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { createChildSchema } from './create-child.dto.js';

export const updateChildSchema = createChildSchema.partial();

export type UpdateChildInput = z.input<typeof updateChildSchema>;
export type UpdateChildOutput = z.output<typeof updateChildSchema>;

export class UpdateChildDto extends createZodDto(updateChildSchema) {}
