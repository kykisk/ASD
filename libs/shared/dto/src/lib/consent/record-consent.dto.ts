import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const recordConsentSchema = z.object({
  consentType: z.enum(['TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'LICENSED_TOOL_USE']),
  consentVersion: z.string().min(1).max(20),
});

export type RecordConsentInput = z.input<typeof recordConsentSchema>;
export type RecordConsentOutput = z.output<typeof recordConsentSchema>;

export class RecordConsentDto extends createZodDto(recordConsentSchema) {}
