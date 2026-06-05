import { Controller, Get, Patch, Post, Param, Body, Query } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '@auticare/prisma-client';
import { AdminService } from './admin.service.js';
import { ResearchBatchService } from '../research/research-batch.service.js';
import { ResearchService } from '../research/research.service.js';

@Controller('admin')
@Roles(UserRole.SYSTEM_ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly researchBatchService: ResearchBatchService,
    private readonly researchService: ResearchService,
  ) {}

  @Get('users')
  async listUsers(
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listUsers({
      search,
      role,
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Patch('users/:id/role')
  async updateUserRole(@Param('id') id: string, @Body() body: { role: string }) {
    return this.adminService.updateUserRole(id, body.role);
  }

  @Patch('users/:id/status')
  async toggleUserStatus(@Param('id') id: string, @Body() body: { isActive: boolean }) {
    return this.adminService.toggleUserStatus(id, body.isActive);
  }

  @Get('families')
  async listFamilies() {
    return this.adminService.listFamilies();
  }

  @Patch('families/:id/tier')
  async updateFamilyTier(@Param('id') id: string, @Body() body: { aiTier: string }) {
    return this.adminService.updateFamilyTier(id, body.aiTier);
  }

  @Get('batch-jobs')
  async listBatchJobs(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listBatchJobs({
      type,
      status,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Post('research/batch')
  async triggerResearchBatch() {
    return this.researchBatchService.runWeeklyBatch();
  }

  @Post('research/re-summarize')
  async triggerReSummarize() {
    return this.researchService.reSummarizeArticles();
  }
}
