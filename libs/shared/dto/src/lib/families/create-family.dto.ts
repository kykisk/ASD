import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const createFamilySchema = z.object({
  name: z
    .string()
    .min(1, '가족 이름은 최소 1자 이상이어야 합니다')
    .max(50, '가족 이름은 최대 50자까지 가능합니다'),
});

export type CreateFamilyInput = z.infer<typeof createFamilySchema>;
export class CreateFamilyDto extends createZodDto(createFamilySchema) {}
