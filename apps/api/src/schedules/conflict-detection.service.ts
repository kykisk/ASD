import { Injectable } from '@nestjs/common';
import { PrismaService } from '@auticare/prisma-client';
import { SchedulesService } from './schedules.service.js';
import type { Schedule } from '@prisma/client';

export interface ConflictResult {
  hasConflict: boolean;
  conflicts: Schedule[];
}

@Injectable()
export class ConflictDetectionService {
  constructor(
    private prisma: PrismaService,
    private schedulesService: SchedulesService,
  ) {}

  async detectConflicts(
    childId: string,
    startTime: Date,
    endTime: Date,
    excludeId?: string,
  ): Promise<ConflictResult> {
    const where: Record<string, unknown> = {
      childId,
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    const directConflicts = await this.prisma.schedule.findMany({ where });

    const recurringWhere: Record<string, unknown> = {
      childId,
      recurrenceType: { not: 'NONE' },
      startTime: { lt: endTime },
    };

    if (excludeId) {
      recurringWhere.id = { not: excludeId };
    }

    const recurringSchedules = await this.prisma.schedule.findMany({
      where: recurringWhere,
    });

    const recurringConflicts: Schedule[] = [];

    for (const schedule of recurringSchedules) {
      if (directConflicts.some((c) => c.id === schedule.id)) {
        continue;
      }

      const oneDayMs = 86400000;
      const occurrences = this.schedulesService.expandRecurrences(
        schedule,
        new Date(startTime.getTime() - oneDayMs),
        new Date(endTime.getTime() + oneDayMs),
      );

      const hasOverlap = occurrences.some(
        (occ) => occ.startTime < endTime && occ.endTime > startTime,
      );

      if (hasOverlap) {
        recurringConflicts.push(schedule);
      }
    }

    const conflicts = [...directConflicts, ...recurringConflicts];

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
    };
  }
}
