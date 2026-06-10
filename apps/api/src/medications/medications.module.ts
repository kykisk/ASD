import { Module } from '@nestjs/common';
import { MedicationsController } from './medications.controller.js';
import { MedicationsService } from './medications.service.js';
import { FamilyResolverService } from '../common/services/family-resolver.service.js';

@Module({
  controllers: [MedicationsController],
  providers: [MedicationsService, FamilyResolverService],
  exports: [MedicationsService],
})
export class MedicationsModule {}
