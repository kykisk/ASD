import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module.js';
import { WellbeingController } from './wellbeing.controller.js';
import { WellbeingService } from './wellbeing.service.js';
import { FamilyResolverService } from '../common/services/family-resolver.service.js';

@Module({
  imports: [AiModule],
  controllers: [WellbeingController],
  providers: [WellbeingService, FamilyResolverService],
  exports: [WellbeingService],
})
export class WellbeingModule {}
