import { Module } from '@nestjs/common';
import { LicensesController } from './licenses.controller.js';
import { LicensesService } from './licenses.service.js';
import { FamilyResolverService } from '../common/services/family-resolver.service.js';

@Module({
  controllers: [LicensesController],
  providers: [LicensesService, FamilyResolverService],
  exports: [LicensesService],
})
export class LicensesModule {}
