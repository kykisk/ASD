import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const registerDeviceTokenSchema = z.object({
  token: z.string().min(1).max(500),
  platform: z.enum(['IOS', 'ANDROID', 'WEB']),
});

export type RegisterDeviceTokenInput = z.infer<typeof registerDeviceTokenSchema>;
export class RegisterDeviceTokenDto extends createZodDto(registerDeviceTokenSchema) {}

const unregisterDeviceTokenSchema = z.object({
  token: z.string().min(1).max(500),
});

export type UnregisterDeviceTokenInput = z.infer<typeof unregisterDeviceTokenSchema>;
export class UnregisterDeviceTokenDto extends createZodDto(unregisterDeviceTokenSchema) {}
