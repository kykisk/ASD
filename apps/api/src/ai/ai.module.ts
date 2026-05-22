import { Module } from '@nestjs/common';
import { PrismaModule } from '@auticare/prisma-client';
import { AiConfigModule } from '../ai-config/ai-config.module.js';
import { AIService } from './ai.service.js';
import { AICostTrackingService } from './ai-cost-tracking.service.js';

@Module({
  imports: [AiConfigModule, PrismaModule],
  providers: [AIService, AICostTrackingService],
  exports: [AIService, AICostTrackingService],
})
export class AiModule {}
