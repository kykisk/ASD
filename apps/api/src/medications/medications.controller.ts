import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import {
  MedicationsService,
  CreateMedicationInput,
  UpsertMedicationLogInput,
  CreateMedicationReactionInput,
} from './medications.service.js';

interface JwtPayload {
  id: string;
  role: string;
  familyId?: string | null;
}

@Controller()
export class MedicationsController {
  constructor(private readonly service: MedicationsService) {}

  // ── Medications ────────────────────────────────────────

  @Post('children/:childId/medications')
  async create(
    @Param('childId') childId: string,
    @Body() input: CreateMedicationInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.createMedication(childId, user.id, user.familyId, input);
  }

  @Get('children/:childId/medications')
  async findByChild(@Param('childId') childId: string, @Query('activeOnly') activeOnly?: string) {
    return this.service.findByChild(childId, activeOnly !== 'false');
  }

  @Patch('medications/:id')
  async update(
    @Param('id') id: string,
    @Body() input: Partial<CreateMedicationInput> & { isActive?: boolean },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updateMedication(id, user.id, user.familyId, input);
  }

  @Delete('medications/:id')
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.deleteMedication(id, user.id, user.familyId);
  }

  // ── Logs ──────────────────────────────────────────────

  @Post('medications/:id/logs')
  async upsertLog(
    @Param('id') medicationId: string,
    @Body() input: UpsertMedicationLogInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.upsertLog(medicationId, user.id, user.familyId, input);
  }

  @Get('children/:childId/medication-logs')
  async findLogs(
    @Param('childId') childId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.findLogs(childId, from, to);
  }

  // ── Reactions ─────────────────────────────────────────

  @Post('medications/:id/reactions')
  async createReaction(
    @Param('id') medicationId: string,
    @Body() input: CreateMedicationReactionInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.createReaction(medicationId, user.id, user.familyId, input);
  }

  @Get('medications/:id/reactions')
  async findReactions(@Param('id') medicationId: string) {
    return this.service.findReactions(medicationId);
  }

  // ── Summary ───────────────────────────────────────────

  @Get('children/:childId/medication-summary')
  async getSummary(
    @Param('childId') childId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const defaultFrom = new Date();
    defaultFrom.setDate(defaultFrom.getDate() - 30);
    return this.service.getSummary(
      childId,
      from ?? defaultFrom.toISOString().split('T')[0],
      to ?? new Date().toISOString().split('T')[0],
    );
  }
}
