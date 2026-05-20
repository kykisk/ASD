import { Module } from '@nestjs/common';
import { AssessmentsController } from './assessments.controller.js';
import { AssessmentsService } from './assessments.service.js';
import { TrendService } from './trend.service.js';
import { DomainAggregationService } from './domain-aggregation.service.js';

@Module({
  controllers: [AssessmentsController],
  providers: [AssessmentsService, TrendService, DomainAggregationService],
  exports: [AssessmentsService, TrendService, DomainAggregationService],
})
export class AssessmentsModule {}
