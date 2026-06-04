import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module.js';
import { SensoryController } from './sensory.controller.js';
import { SensoryService } from './sensory.service.js';

@Module({
  imports: [AiModule],
  controllers: [SensoryController],
  providers: [SensoryService],
  exports: [SensoryService],
})
export class SensoryModule {}
