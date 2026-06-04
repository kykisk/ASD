import { FamilyResolverService } from '../common/services/family-resolver.service.js';
import { Module } from '@nestjs/common';
import { CollaborationController } from './collaboration.controller.js';
import { CollaborationService } from './collaboration.service.js';

@Module({
  controllers: [CollaborationController],
  providers: [FamilyResolverService, CollaborationService],
  exports: [CollaborationService],
})
export class CollaborationModule {}
