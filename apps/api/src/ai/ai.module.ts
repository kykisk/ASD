import { Module } from '@nestjs/common';
import { AiConfigModule } from '../ai-config/ai-config.module.js';
import { AIService } from './ai.service.js';
import { AICostTrackingService } from './ai-cost-tracking.service.js';

@Module({
  imports: [AiConfigModule],
  providers: [AIService, AICostTrackingService],
  exports: [AIService, AICostTrackingService],
})
export class AiModule {}
