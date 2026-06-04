import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { SensoryService } from './sensory.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@Controller()
export class SensoryController {
  constructor(private readonly sensoryService: SensoryService) {}

  @Post('children/:childId/sensory-profiles')
  async createProfile(
    @CurrentUser() user: { id: string; familyId: string },
    @Param('childId') childId: string,
    @Body()
    body: {
      visual: number;
      auditory: number;
      tactile: number;
      vestibular: number;
      proprioception: number;
      olfactory: number;
      notes?: string;
    },
  ) {
    return this.sensoryService.createProfile(childId, user.familyId, body);
  }

  @Get('children/:childId/sensory-profiles')
  async getProfiles(
    @CurrentUser() user: { id: string },
    @Param('childId') childId: string,
    @Query('limit') limit?: string,
  ) {
    return this.sensoryService.getProfiles(
      childId,
      user.id,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Get('children/:childId/sensory-profiles/latest')
  async getLatest(@CurrentUser() user: { id: string }, @Param('childId') childId: string) {
    return this.sensoryService.getLatest(childId, user.id);
  }

  @Get('children/:childId/sensory-profiles/trends')
  async getTrends(@CurrentUser() user: { id: string }, @Param('childId') childId: string) {
    return this.sensoryService.getTrends(childId, user.id);
  }
}
