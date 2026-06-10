import { Injectable } from '@nestjs/common';
import { PrismaService } from '@auticare/prisma-client';
import { ApiException } from '../common/exceptions/api.exception.js';
import { FamilyResolverService } from '../common/services/family-resolver.service.js';

export interface CreateMedicationInput {
  name: string;
  dosage?: string;
  method?: string;
  prescribedBy?: string;
  startDate: string;
  endDate?: string | null;
  frequency?: string;
  notes?: string;
}

export interface UpsertMedicationLogInput {
  logDate: string;
  taken: boolean;
  takenAt?: string | null;
  skippedReason?: string | null;
}

export interface CreateMedicationReactionInput {
  observedAt: string;
  moodScore?: number | null;
  notes?: string | null;
  sideEffects?: string[];
}

@Injectable()
export class MedicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly familyResolver: FamilyResolverService,
  ) {}

  // ── Medications ────────────────────────────────────────

  async createMedication(
    childId: string,
    userId: string,
    jwtFamilyId: string | null | undefined,
    input: CreateMedicationInput,
  ) {
    const familyId = await this.familyResolver.resolve(userId, jwtFamilyId);
    if (!familyId) throw new ApiException(400, 'FAMILY_001', '가족 정보를 찾을 수 없습니다');

    const child = await this.prisma.child.findUnique({ where: { id: childId } });
    if (!child) throw new ApiException(404, 'CHILD_404', '아이를 찾을 수 없습니다');

    return this.prisma.medication.create({
      data: {
        childId,
        familyId,
        name: input.name,
        dosage: input.dosage ?? null,
        method: input.method ?? null,
        prescribedBy: input.prescribedBy ?? null,
        startDate: new Date(input.startDate),
        endDate: input.endDate ? new Date(input.endDate) : null,
        frequency: input.frequency ?? null,
        notes: input.notes ?? null,
      },
    });
  }

  async findByChild(childId: string, activeOnly = true) {
    return this.prisma.medication.findMany({
      where: { childId, ...(activeOnly ? { isActive: true } : {}) },
      orderBy: [{ isActive: 'desc' }, { startDate: 'desc' }],
      include: {
        _count: { select: { logs: true, reactions: true } },
      },
    });
  }

  async updateMedication(
    id: string,
    userId: string,
    jwtFamilyId: string | null | undefined,
    input: Partial<CreateMedicationInput> & { isActive?: boolean },
  ) {
    const med = await this.prisma.medication.findUnique({ where: { id } });
    if (!med) throw new ApiException(404, 'MED_404', '약물을 찾을 수 없습니다');

    const familyId = await this.familyResolver.resolve(userId, jwtFamilyId);
    if (med.familyId !== familyId) throw new ApiException(403, 'MED_403', '권한이 없습니다');

    return this.prisma.medication.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.dosage !== undefined && { dosage: input.dosage }),
        ...(input.method !== undefined && { method: input.method }),
        ...(input.prescribedBy !== undefined && { prescribedBy: input.prescribedBy }),
        ...(input.startDate !== undefined && { startDate: new Date(input.startDate) }),
        ...(input.endDate !== undefined && {
          endDate: input.endDate ? new Date(input.endDate) : null,
        }),
        ...(input.frequency !== undefined && { frequency: input.frequency }),
        ...(input.notes !== undefined && { notes: input.notes }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });
  }

  async deleteMedication(id: string, userId: string, jwtFamilyId: string | null | undefined) {
    const med = await this.prisma.medication.findUnique({ where: { id } });
    if (!med) throw new ApiException(404, 'MED_404', '약물을 찾을 수 없습니다');

    const familyId = await this.familyResolver.resolve(userId, jwtFamilyId);
    if (med.familyId !== familyId) throw new ApiException(403, 'MED_403', '권한이 없습니다');

    // soft delete
    return this.prisma.medication.update({ where: { id }, data: { isActive: false } });
  }

  // ── Logs ──────────────────────────────────────────────

  async upsertLog(
    medicationId: string,
    userId: string,
    jwtFamilyId: string | null | undefined,
    input: UpsertMedicationLogInput,
  ) {
    const med = await this.prisma.medication.findUnique({ where: { id: medicationId } });
    if (!med) throw new ApiException(404, 'MED_404', '약물을 찾을 수 없습니다');

    const familyId = await this.familyResolver.resolve(userId, jwtFamilyId);
    if (med.familyId !== familyId) throw new ApiException(403, 'MED_403', '권한이 없습니다');

    const logDate = new Date(input.logDate);
    logDate.setUTCHours(0, 0, 0, 0);

    return this.prisma.medicationLog.upsert({
      where: { medicationId_logDate: { medicationId, logDate } },
      create: {
        medicationId,
        childId: med.childId,
        familyId: med.familyId,
        logDate,
        taken: input.taken,
        takenAt: input.takenAt ? new Date(input.takenAt) : null,
        skippedReason: input.skippedReason ?? null,
      },
      update: {
        taken: input.taken,
        takenAt: input.takenAt ? new Date(input.takenAt) : null,
        skippedReason: input.skippedReason ?? null,
      },
    });
  }

  async findLogs(childId: string, from?: string, to?: string) {
    const where: Record<string, unknown> = { childId };
    if (from || to) {
      where['logDate'] = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to + 'T23:59:59.999Z') } : {}),
      };
    }
    return this.prisma.medicationLog.findMany({
      where,
      orderBy: { logDate: 'desc' },
      include: { medication: { select: { id: true, name: true, dosage: true } } },
    });
  }

  // ── Reactions ─────────────────────────────────────────

  async createReaction(
    medicationId: string,
    userId: string,
    jwtFamilyId: string | null | undefined,
    input: CreateMedicationReactionInput,
  ) {
    const med = await this.prisma.medication.findUnique({ where: { id: medicationId } });
    if (!med) throw new ApiException(404, 'MED_404', '약물을 찾을 수 없습니다');

    const familyId = await this.familyResolver.resolve(userId, jwtFamilyId);
    if (med.familyId !== familyId) throw new ApiException(403, 'MED_403', '권한이 없습니다');

    const sideEffects = input.sideEffects ?? [];
    return this.prisma.medicationReaction.create({
      data: {
        medicationId,
        childId: med.childId,
        familyId: med.familyId,
        observedAt: new Date(input.observedAt),
        moodScore: input.moodScore ?? null,
        notes: input.notes ?? null,
        sideEffects,
        hasAnySideEffect: sideEffects.length > 0,
      },
    });
  }

  async findReactions(medicationId: string) {
    return this.prisma.medicationReaction.findMany({
      where: { medicationId },
      orderBy: { observedAt: 'desc' },
    });
  }

  // ── Summary ───────────────────────────────────────────

  async getSummary(childId: string, from: string, to: string) {
    const dateFrom = new Date(from);
    const dateTo = new Date(to + 'T23:59:59.999Z');

    const medications = await this.prisma.medication.findMany({
      where: { childId },
      include: {
        logs: {
          where: { logDate: { gte: dateFrom, lte: dateTo } },
          orderBy: { logDate: 'asc' },
        },
        reactions: {
          where: { observedAt: { gte: dateFrom, lte: dateTo } },
          orderBy: { observedAt: 'asc' },
        },
      },
    });

    return medications.map((med) => {
      const total = med.logs.length;
      const taken = med.logs.filter((l) => l.taken).length;
      const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : null;

      const allSideEffects = med.reactions.flatMap((r) => r.sideEffects);
      const sideEffectCounts: Record<string, number> = {};
      for (const se of allSideEffects) {
        sideEffectCounts[se] = (sideEffectCounts[se] ?? 0) + 1;
      }

      const avgMood =
        med.reactions.filter((r) => r.moodScore !== null).length > 0
          ? Math.round(
              (med.reactions.reduce((s, r) => s + (r.moodScore ?? 0), 0) /
                med.reactions.filter((r) => r.moodScore !== null).length) *
                10,
            ) / 10
          : null;

      return {
        medicationId: med.id,
        name: med.name,
        dosage: med.dosage,
        isActive: med.isActive,
        period: { from, to },
        adherence: { total, taken, skipped: total - taken, adherenceRate },
        reactions: {
          count: med.reactions.length,
          avgMoodScore: avgMood,
          sideEffectCounts,
          hasAnySideEffect: med.reactions.some((r) => r.hasAnySideEffect),
          recentNotes: med.reactions
            .filter((r) => r.notes)
            .slice(0, 3)
            .map((r) => ({ date: r.observedAt.toISOString().split('T')[0], note: r.notes! })),
        },
      };
    });
  }
}
