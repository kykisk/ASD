import { z } from 'zod';

export const scheduleSuggestionSchema = z.object({
  suggestions: z
    .array(
      z.object({
        type: z.enum(['ADD', 'MODIFY', 'REMOVE', 'REORDER']),
        title: z.string(),
        category: z.enum(['THERAPY', 'EDUCATION', 'FREE_PLAY', 'MEAL', 'SLEEP', 'OTHER']),
        reasoning: z.string(),
        suggestedTime: z.string().optional(),
        suggestedDuration: z.number().int().min(5).max(240).optional(),
      }),
    )
    .max(5),
  summary: z.string().optional().default(''),
});

export type ScheduleSuggestion = z.infer<typeof scheduleSuggestionSchema>;
