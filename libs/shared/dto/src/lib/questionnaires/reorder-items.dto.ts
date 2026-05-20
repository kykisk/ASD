import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const reorderItemsSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    orderIndex: z.number().int().min(0),
  })).min(1),
});

export type ReorderItemsInput = z.input<typeof reorderItemsSchema>;
export type ReorderItemsOutput = z.output<typeof reorderItemsSchema>;

export class ReorderItemsDto extends createZodDto(reorderItemsSchema) {}
