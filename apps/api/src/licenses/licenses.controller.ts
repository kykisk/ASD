import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { LicensedTool } from '@auticare/prisma-client';
import { LicensesService } from './licenses.service.js';
import { AssessmentScoringService } from './assessment-scoring.service.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { FamilyResolverService } from '../common/services/family-resolver.service.js';
import { UserRole } from '@auticare/prisma-client';

@Controller()
export class LicensesController {
  constructor(
    private readonly licensesService: LicensesService,
    private readonly scoringService: AssessmentScoringService,
    private readonly familyResolver: FamilyResolverService,
  ) {}

  // ── Admin endpoints ──────────────────────────────────────────

  @Post('admin/licenses')
  @Roles(UserRole.SYSTEM_ADMIN)
  async register(
    @CurrentUser() user: { id: string },
    @Body()
    body: {
      tool: LicensedTool;
      licenseKey: string;
      familyId: string;
      expiresAt?: string;
      notes?: string;
    },
  ) {
    return this.licensesService.register({
      tool: body.tool,
      licenseKey: body.licenseKey,
      familyId: body.familyId,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      notes: body.notes,
      registeredBy: user.id,
    });
  }

  @Get('admin/licenses')
  @Roles(UserRole.SYSTEM_ADMIN)
  async listAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.licensesService.listAll(page ? parseInt(page) : 1, limit ? parseInt(limit) : 20);
  }

  @Patch('admin/licenses/:id/activate')
  @Roles(UserRole.SYSTEM_ADMIN)
  async activate(@Param('id') id: string) {
    return this.licensesService.activate(id);
  }

  @Patch('admin/licenses/:id/revoke')
  @Roles(UserRole.SYSTEM_ADMIN)
  async revoke(@Param('id') id: string) {
    return this.licensesService.revoke(id);
  }

  @Delete('admin/licenses/:id')
  @Roles(UserRole.SYSTEM_ADMIN)
  async remove(@Param('id') id: string) {
    await this.licensesService.remove(id);
    return { message: '라이선스가 삭제되었습니다' };
  }

  // ── Family endpoints ─────────────────────────────────────────

  @Get('families/:familyId/licenses')
  async getFamilyLicenses(
    @CurrentUser() user: { id: string; familyId: string | null },
    @Param('familyId') familyId: string,
  ) {
    const resolvedId = await this.familyResolver.resolve(user.id, user.familyId);
    if (resolvedId !== familyId) return [];
    return this.licensesService.getFamilyLicenses(familyId);
  }

  @Get('families/:familyId/licenses/:tool')
  async checkLicense(
    @CurrentUser() user: { id: string; familyId: string | null },
    @Param('familyId') familyId: string,
    @Param('tool') tool: LicensedTool,
  ) {
    const resolvedId = await this.familyResolver.resolve(user.id, user.familyId);
    const hasLicense =
      resolvedId === familyId ? await this.licensesService.validateLicense(familyId, tool) : false;
    return { tool, hasLicense };
  }

  @Post('assessments/:assessmentId/score')
  async scoreAssessment(@Param('assessmentId') assessmentId: string) {
    return this.scoringService.score(assessmentId);
  }
}
