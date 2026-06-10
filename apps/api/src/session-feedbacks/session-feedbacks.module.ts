import { Module } from '@nestjs/common';
import { SessionFeedbacksController } from './session-feedbacks.controller.js';
import { SessionFeedbacksService } from './session-feedbacks.service.js';
import { FeedbackDigestService } from './feedback-digest.service.js';
import { FeedbackDigestBatchService } from './feedback-digest-batch.service.js';
import { AiModule } from '../ai/ai.module.js';
import { FamilyResolverService } from '../common/services/family-resolver.service.js';

@Module({
  imports: [AiModule],
  controllers: [SessionFeedbacksController],
  providers: [
    SessionFeedbacksService,
    FeedbackDigestService,
    FeedbackDigestBatchService,
    FamilyResolverService,
  ],
  exports: [SessionFeedbacksService, FeedbackDigestService],
})
export class SessionFeedbacksModule {}
