import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module.js';
import { ResearchModule } from '../research/research.module.js';
import { SessionFeedbacksModule } from '../session-feedbacks/session-feedbacks.module.js';
import { ConcernsController } from './concerns.controller.js';
import { ConcernsService } from './concerns.service.js';

@Module({
  imports: [AiModule, ResearchModule, SessionFeedbacksModule],
  controllers: [ConcernsController],
  providers: [ConcernsService],
})
export class ConcernsModule {}
