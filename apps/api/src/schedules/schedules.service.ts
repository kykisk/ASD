import { Injectable } from '@nestjs/common';
import { PrismaService } from '@auticare/prisma-client';
import { ApiException } from '../common/exceptions/api.exception.js';
import { CacheService } from '../common/cache/cache.service.js';
import type { CreateScheduleInput, UpdateScheduleInput, QueryScheduleInput } from '@auticare/dto';
import type { Schedule, RecurrenceType } from '@prisma/client';

export interface ScheduleOccurrence {
  id: string;
  originalScheduleId: string;
  childId: string;
  familyId: string;
  title: string;
  description: string | null;
  category: string;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  recurrenceType: string;
  location: string | null;
  notes: string | null;
  color: string | null;
  isRecurrenceInstance: boolean;
}

@Injectable()
export class SchedulesService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  async create(
    childId: string,
    familyId: string,
    userId: string,
    dto: CreateScheduleInput,
  ): Promise<Schedule> {
    await this.verifyFamilyMember(familyId, userId);

    const child = await this.prisma.child.findUnique({
      where: { id: childId },
    });

    if (!child || child.familyId !== familyId) {
      throw new ApiException(404, 'CHILD_404', '아이를 찾을 수 없습니다');
    }

    return this.prisma.schedule.create({
      data: {
        childId,
        familyId,
        title: dto.title,
        description: dto.description ?? null,
        category: dto.category,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        isAllDay: dto.isAllDay ?? false,
        recurrenceType: dto.recurrenceType ?? 'NONE',
        recurrenceRule: dto.recurrenceRule ?? undefined,
        recurrenceEnd: dto.recurrenceEnd ? new Date(dto.recurrenceEnd) : null,
        location: dto.location ?? null,
        notes: dto.notes ?? null,
        color: dto.color ?? null,
      },
    }).then(async (schedule) => {
      await this.cacheService.delByPattern('dashboard:*');
      return schedule;
    });
  }

  async findByChild(
    childId: string,
    userId: string,
    query: QueryScheduleInput,
  ): Promise<ScheduleOccurrence[]> {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
    });

    if (!child) {
      throw new ApiException(404, 'CHILD_404', '아이를 찾을 수 없습니다');
    }

    await this.verifyFamilyMember(child.familyId, userId);

    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    const where: Record<string, unknown> = {
      childId,
      OR: [
        {
          recurrenceType: 'NONE',
          startTime: { lt: endDate },
          endTime: { gt: startDate },
        },
        {
          recurrenceType: { not: 'NONE' },
          startTime: { lt: endDate },
        },
      ],
    };

    if (query.category) {
      where.category = query.category;
    }

    const schedules = await this.prisma.schedule.findMany({
      where,
      orderBy: { startTime: 'asc' },
    });

    const occurrences: ScheduleOccurrence[] = [];

    for (const schedule of schedules) {
      const expanded = this.expandRecurrences(schedule, startDate, endDate);
      occurrences.push(...expanded);
    }

    occurrences.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    return occurrences;
  }

  async findOne(scheduleId: string, userId: string): Promise<Schedule> {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new ApiException(404, 'SCHEDULE_404', '일정을 찾을 수 없습니다');
    }

    await this.verifyFamilyMember(schedule.familyId, userId);

    return schedule;
  }

  async update(
    scheduleId: string,
    userId: string,
    dto: UpdateScheduleInput,
  ): Promise<Schedule> {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new ApiException(404, 'SCHEDULE_404', '일정을 찾을 수 없습니다');
    }

    await this.verifyFamilyMember(schedule.familyId, userId);

    const data: Record<string, unknown> = {};

    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.startTime !== undefined) data.startTime = new Date(dto.startTime);
    if (dto.endTime !== undefined) data.endTime = new Date(dto.endTime);
    if (dto.isAllDay !== undefined) data.isAllDay = dto.isAllDay;
    if (dto.recurrenceType !== undefined) data.recurrenceType = dto.recurrenceType;
    if (dto.recurrenceRule !== undefined) data.recurrenceRule = dto.recurrenceRule;
    if (dto.recurrenceEnd !== undefined) data.recurrenceEnd = new Date(dto.recurrenceEnd);
    if (dto.location !== undefined) data.location = dto.location;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.color !== undefined) data.color = dto.color;

    return this.prisma.schedule.update({
      where: { id: scheduleId },
      data,
    }).then(async (schedule) => {
      await this.cacheService.delByPattern('dashboard:*');
      return schedule;
    });
  }

  async remove(scheduleId: string, userId: string): Promise<{ deleted: true }> {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new ApiException(404, 'SCHEDULE_404', '일정을 찾을 수 없습니다');
    }

    await this.verifyFamilyMember(schedule.familyId, userId);

    await this.prisma.schedule.delete({ where: { id: scheduleId } });
    await this.cacheService.delByPattern('dashboard:*');
    return { deleted: true };
  }

  expandRecurrences(
    schedule: Schedule,
    startDate: Date,
    endDate: Date,
  ): ScheduleOccurrence[] {
    const occurrences: ScheduleOccurrence[] = [];
    const scheduleStart = new Date(schedule.startTime);
    const scheduleEnd = new Date(schedule.endTime);
    const duration = scheduleEnd.getTime() - scheduleStart.getTime();

    const recurrenceEnd = schedule.recurrenceEnd
      ? new Date(schedule.recurrenceEnd)
      : endDate;
    const effectiveEnd = recurrenceEnd < endDate ? recurrenceEnd : endDate;

    const toOccurrence = (occStart: Date): ScheduleOccurrence => ({
      id: `${schedule.id}_${occStart.toISOString()}`,
      originalScheduleId: schedule.id,
      childId: schedule.childId,
      familyId: schedule.familyId,
      title: schedule.title,
      description: schedule.description,
      category: schedule.category,
      startTime: occStart,
      endTime: new Date(occStart.getTime() + duration),
      isAllDay: schedule.isAllDay,
      recurrenceType: schedule.recurrenceType,
      location: schedule.location,
      notes: schedule.notes,
      color: schedule.color,
      isRecurrenceInstance: schedule.recurrenceType !== 'NONE',
    });

    if (schedule.recurrenceType === 'NONE') {
      if (scheduleStart < endDate && scheduleEnd > startDate) {
        occurrences.push(toOccurrence(scheduleStart));
      }
      return occurrences;
    }

    const rule = schedule.recurrenceRule as { daysOfWeek?: number[]; interval?: number; endDate?: string } | null;
    const interval = rule?.interval ?? 1;

    if (schedule.recurrenceType === 'DAILY') {
      const current = new Date(scheduleStart);
      while (current < effectiveEnd) {
        const occEnd = new Date(current.getTime() + duration);
        if (occEnd > startDate && current < endDate) {
          occurrences.push(toOccurrence(new Date(current)));
        }
        current.setDate(current.getDate() + interval);
      }
    } else if (schedule.recurrenceType === 'WEEKLY') {
      const current = new Date(scheduleStart);
      while (current < effectiveEnd) {
        const occEnd = new Date(current.getTime() + duration);
        if (occEnd > startDate && current < endDate) {
          occurrences.push(toOccurrence(new Date(current)));
        }
        current.setDate(current.getDate() + 7 * interval);
      }
    } else if (schedule.recurrenceType === 'SPECIFIC_DAYS') {
      const daysOfWeek = rule?.daysOfWeek ?? [];
      if (daysOfWeek.length === 0) {
        return occurrences;
      }

      const current = new Date(scheduleStart);
      if (current < startDate) {
        current.setTime(startDate.getTime());
        current.setHours(scheduleStart.getHours(), scheduleStart.getMinutes(), scheduleStart.getSeconds(), scheduleStart.getMilliseconds());
        current.setDate(current.getDate() - 1);
      }

      while (current < effectiveEnd) {
        if (daysOfWeek.includes(current.getDay())) {
          const occEnd = new Date(current.getTime() + duration);
          if (occEnd > startDate && current < endDate && current >= scheduleStart) {
            occurrences.push(toOccurrence(new Date(current)));
          }
        }
        current.setDate(current.getDate() + 1);
      }
    }

    return occurrences;
  }

  private async verifyFamilyMember(familyId: string, userId: string) {
    const membership = await this.prisma.familyMember.findUnique({
      where: { userId_familyId: { userId, familyId } },
    });

    if (!membership) {
      throw new ApiException(403, 'FORBIDDEN', '가족 구성원이 아닙니다');
    }

    return membership;
  }
}
