import { Controller, Get, Patch, Post, Delete, Param, Body, Query } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '@auticare/prisma-client';
import { AdminService } from './admin.service.js';
import { ResearchBatchService } from '../research/research-batch.service.js';
import { ResearchService } from '../research/research.service.js';
import { AdminJobsService } from './admin-jobs.service.js';
import { AdminOverviewService } from './admin-overview.service.js';
import { AdminAccountsService } from './admin-accounts.service.js';
import { AICostTrackingService } from '../ai/ai-cost-tracking.service.js';

@Controller('admin')
@Roles(UserRole.SYSTEM_ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly researchBatchService: ResearchBatchService,
    private readonly researchService: ResearchService,
    private readonly jobs: AdminJobsService,
    private readonly overviewService: AdminOverviewService,
    private readonly accounts: AdminAccountsService,
    private readonly costTracker: AICostTrackingService,
  ) {}

  /** 운영 현황 (관리자 첫 화면) */
  @Get('overview')
  async overview() {
    return this.overviewService.overview();
  }

  /** AI 사용량: 최근 days 일 모델별 호출, 오늘 기능별, 이번 달 추정 비용, 최근 실패 */
  @Get('ai/usage')
  async aiUsage(@Query('days') days?: string) {
    return this.costTracker.getUsageSummary(Math.min(parseInt(days ?? '7') || 7, 30));
  }

  /** 오늘 하루 기록 · 쭉 적기 품질 (건수와 비율만) */
  @Get('ai/daily-record-quality')
  async dailyRecordQuality(@Query('days') days?: string) {
    return this.adminService.dailyRecordQuality(Math.min(parseInt(days ?? '7') || 7, 90));
  }

  @Get('jobs')
  async listJobs() {
    return this.jobs.list();
  }

  @Get('jobs/:type/runs')
  async jobRuns(@Param('type') type: string, @Query('limit') limit?: string) {
    return this.jobs.runs(type, limit ? parseInt(limit) : 10);
  }

  @Post('jobs/:type/run')
  async runJob(@Param('type') type: string) {
    return this.jobs.run(type);
  }

  @Post('users/:id/temp-password')
  async issueTempPassword(@Param('id') id: string) {
    return this.accounts.issueTempPassword(id);
  }

  /** 계정 삭제 (테스트 계정 정리). body.confirmEmail 이 계정 이메일과 같아야 함 */
  @Delete('users/:id')
  async deleteUser(@Param('id') id: string, @Body() body: { confirmEmail?: string }) {
    return this.accounts.deleteUser(id, body?.confirmEmail ?? '');
  }

  @Get('audit-logs')
  async auditLogs(
    @Query('resource') resource?: string,
    @Query('action') action?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listAuditLogs({
      resource,
      action,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('questionnaires')
  async questionnaires() {
    return this.adminService.listQuestionnaires();
  }

  @Get('questionnaires/:id/items')
  async questionnaireItems(@Param('id') id: string) {
    return this.adminService.getQuestionnaireItems(id);
  }

  @Patch('questionnaires/:id/active')
  async setQuestionnaireActive(@Param('id') id: string, @Body() body: { isActive: boolean }) {
    return this.adminService.setQuestionnaireActive(id, !!body.isActive);
  }

  @Get('research/articles')
  async researchArticles(
    @Query('missingSummaryOnly') missingSummaryOnly?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listResearchArticles({
      missingSummaryOnly: missingSummaryOnly === 'true',
      limit: limit ? parseInt(limit) : undefined,
    });
  }

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
