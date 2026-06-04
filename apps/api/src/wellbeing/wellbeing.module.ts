import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module.js';
import { WellbeingController } from './wellbeing.controller.js';
import { WellbeingService } from './wellbeing.service.js';

@Module({
  imports: [AiModule],
  controllers: [WellbeingController],
  providers: [WellbeingService],
  exports: [WellbeingService],
})
export class WellbeingModule {}
