import { Injectable } from '@nestjs/common';
import { PrismaService } from '@auticare/prisma-client';
import { ApiException } from '../common/exceptions/api.exception.js';
import type { LogActivityInput } from '@auticare/dto';
import type { ActivityLog } from '@prisma/client';

@Injectable()
export class ActivityService {
  constructor(private prisma: PrismaService) {}

  async logActivity(userId: string, dto: LogActivityInput): Promise<ActivityLog> {
    const curriculum = await this.prisma.curriculum.findUnique({
      where: { id: dto.curriculumId },
    });

    if (!curriculum) {
      throw new ApiException(404, 'CURRICULUM_404', '커리큘럼을 찾을 수 없습니다');
    }

    await this.verifyFamilyMember(curriculum.familyId, userId);

    const activityLog = await this.prisma.activityLog.create({
      data: {
        curriculumId: dto.curriculumId,
        childId: curriculum.childId,
        activityIndex: dto.activityIndex,
        activityTitle: dto.activityTitle,
        result: dto.result,
        durationMin: dto.durationMin ?? null,
        notes: dto.notes ?? null,
      },
    });

    // Check if all activities are logged → auto-complete curriculum
    const activities = curriculum.activities as unknown as Array<Record<string, unknown>>;
    const totalActivities = activities.length;

    if (totalActivities > 0) {
      const loggedCount = await this.prisma.activityLog.count({
        where: { curriculumId: dto.curriculumId },
      });

      if (loggedCount >= totalActivities) {
        await this.prisma.curriculum.update({
          where: { id: dto.curriculumId },
          data: { status: 'COMPLETED', completedAt: new Date() },
        });
      }
    }

    return activityLog;
  }

  async getActivityLogs(curriculumId: string, userId: string): Promise<ActivityLog[]> {
    const curriculum = await this.prisma.curriculum.findUnique({
      where: { id: curriculumId },
    });

    if (!curriculum) {
      throw new ApiException(404, 'CURRICULUM_404', '커리큘럼을 찾을 수 없습니다');
    }

    await this.verifyFamilyMember(curriculum.familyId, userId);

    return this.prisma.activityLog.findMany({
      where: { curriculumId },
      orderBy: { loggedAt: 'asc' },
    });
  }

  async deleteActivityLog(logId: string, userId: string): Promise<void> {
    const log = await this.prisma.activityLog.findUnique({
      where: { id: logId },
      include: { curriculum: true },
    });

    if (!log) {
      throw new ApiException(404, 'ACTIVITY_404', '활동 로그를 찾을 수 없습니다');
    }

    await this.verifyFamilyMember(log.curriculum.familyId, userId);

    await this.prisma.activityLog.delete({ where: { id: logId } });

    // If curriculum was COMPLETED, revert to CONFIRMED (or GENERATED)
    if (log.curriculum.status === 'COMPLETED') {
      const newStatus = log.curriculum.confirmedAt ? 'CONFIRMED' : 'GENERATED';
      await this.prisma.curriculum.update({
        where: { id: log.curriculumId },
        data: { status: newStatus, completedAt: null },
      });
    }
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
