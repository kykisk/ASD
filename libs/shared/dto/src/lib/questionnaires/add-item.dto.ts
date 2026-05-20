import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const addItemSchema = z.object({
  domain: z.string(),
  text: z.string().min(1).max(500),
  description: z.string().max(500).optional(),
  orderIndex: z.number().int().min(0),
  weight: z.number().min(0.1).max(5.0).default(1.0),
});

export type AddItemInput = z.input<typeof addItemSchema>;
export type AddItemOutput = z.output<typeof addItemSchema>;

export class AddItemDto extends createZodDto(addItemSchema) {}
