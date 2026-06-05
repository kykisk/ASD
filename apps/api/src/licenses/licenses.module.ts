import { Module } from '@nestjs/common';
import { LicensesController } from './licenses.controller.js';
import { LicensesService } from './licenses.service.js';
import { LicensedToolDataService } from './licensed-tool-data.service.js';
import { FamilyResolverService } from '../common/services/family-resolver.service.js';

@Module({
  controllers: [LicensesController],
  providers: [LicensesService, LicensedToolDataService, FamilyResolverService],
  exports: [LicensesService, LicensedToolDataService],
})
export class LicensesModule {}
