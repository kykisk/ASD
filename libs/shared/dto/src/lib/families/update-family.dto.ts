import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const updateFamilySchema = z.object({
  name: z
    .string()
    .min(1, '가족 이름은 최소 1자 이상이어야 합니다')
    .max(50, '가족 이름은 최대 50자까지 가능합니다')
    .optional(),
});

export type UpdateFamilyInput = z.infer<typeof updateFamilySchema>;
export class UpdateFamilyDto extends createZodDto(updateFamilySchema) {}
