import { Module } from '@nestjs/common';
import { AiConfigController } from './ai-config.controller.js';
import { AiConfigService } from './ai-config.service.js';
import { AiFeatureConfigService } from './ai-feature-config.service.js';

@Module({
  controllers: [AiConfigController],
  providers: [AiConfigService, AiFeatureConfigService],
  exports: [AiConfigService, AiFeatureConfigService],
})
export class AiConfigModule {}
