import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { AssessmentsService } from './assessments.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { CreateAssessmentDto, QueryAssessmentDto } from '@auticare/dto';

@Controller('v1')
export class AssessmentsController {
  constructor(private assessmentsService: AssessmentsService) {}

  @Post('children/:childId/assessments')
  async create(
    @CurrentUser() user: { id: string; familyId: string },
    @Param('childId') childId: string,
    @Body() dto: CreateAssessmentDto,
  ) {
    return this.assessmentsService.create(childId, user.familyId, user.id, dto);
  }

  @Get('children/:childId/assessments')
  async findByChild(
    @CurrentUser() user: { id: string },
    @Param('childId') childId: string,
    @Query() query: QueryAssessmentDto,
  ) {
    return this.assessmentsService.findByChild(childId, user.id, query);
  }

  @Get('assessments/:id')
  async findOne(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.assessmentsService.findOne(id, user.id);
  }

  @Get('children/:childId/assessments/aggregated')
  async getAggregated(
    @CurrentUser() user: { id: string },
    @Param('childId') childId: string,
  ) {
    return this.assessmentsService.getAggregated(childId, user.id);
  }
}
