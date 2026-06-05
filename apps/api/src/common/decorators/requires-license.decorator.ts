import { SetMetadata } from '@nestjs/common';
import { LicensedTool } from '@auticare/prisma-client';

export const REQUIRES_LICENSE_KEY = 'requiresLicense';
export const RequiresLicense = (tool: LicensedTool) => SetMetadata(REQUIRES_LICENSE_KEY, tool);
