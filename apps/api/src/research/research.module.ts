import { FamilyResolverService } from '../common/services/family-resolver.service.js';
import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { PubmedService } from './pubmed.service.js';
import { ResearchService } from './research.service.js';
import { ResearchBatchService } from './research-batch.service.js';
import { ResearchController } from './research.controller.js';

@Module({
  imports: [AiModule, NotificationsModule],
  controllers: [ResearchController],
  providers: [FamilyResolverService, PubmedService, ResearchService, ResearchBatchService],
  exports: [ResearchService, ResearchBatchService],
})
export class ResearchModule {}
