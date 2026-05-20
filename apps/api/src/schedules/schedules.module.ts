import { Module } from '@nestjs/common';
import { SchedulesController } from './schedules.controller.js';
import { SchedulesService } from './schedules.service.js';
import { ConflictDetectionService } from './conflict-detection.service.js';

@Module({
  controllers: [SchedulesController],
  providers: [SchedulesService, ConflictDetectionService],
  exports: [SchedulesService, ConflictDetectionService],
})
export class SchedulesModule {}
