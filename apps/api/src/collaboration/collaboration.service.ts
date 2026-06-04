import { Injectable } from '@nestjs/common';
import { PrismaService } from '@auticare/prisma-client';
import { ApiException } from '../common/exceptions/api.exception.js';

interface AssignRoleInput {
  assignedTo: string;
  childId?: string;
  title: string;
  description?: string;
  date: string;
}

@Injectable()
export class CollaborationService {
  constructor(private readonly prisma: PrismaService) {}

  async assignRole(familyId: string, assignedBy: string, input: AssignRoleInput) {
    return this.prisma.roleAssignment.create({
      data: {
        familyId,
        assignedBy,
        assignedTo: input.assignedTo,
        childId: input.childId,
        title: input.title,
        description: input.description,
        date: input.date,
      },
    });
  }

  async getRoleAssignments(familyId: string, date: string) {
    return this.prisma.roleAssignment.findMany({
      where: { familyId, date },
      include: {
        assignedToUser: { select: { id: true, name: true, email: true } },
        assignedByUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async completeRole(id: string, userId: string) {
    const assignment = await this.prisma.roleAssignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      throw new ApiException(404, 'COLLAB_001', '역할 배정을 찾을 수 없습니다');
    }

    if (assignment.assignedTo !== userId) {
      throw new ApiException(403, 'COLLAB_002', '배정된 사용자만 완료할 수 있습니다');
    }

    return this.prisma.roleAssignment.update({
      where: { id },
      data: { isCompleted: true, completedAt: new Date() },
    });
  }

  async addComment(activityLogId: string, userId: string, content: string) {
    const activityLog = await this.prisma.activityLog.findUnique({
      where: { id: activityLogId },
    });

    if (!activityLog) {
      throw new ApiException(404, 'COLLAB_003', '활동 로그를 찾을 수 없습니다');
    }

    return this.prisma.activityComment.create({
      data: {
        activityLogId,
        userId,
        content,
      },
    });
  }

  async getComments(activityLogId: string, userId: string) {
    return this.prisma.activityComment.findMany({
      where: { activityLogId },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.prisma.activityComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new ApiException(404, 'COLLAB_004', '댓글을 찾을 수 없습니다');
    }

    if (comment.userId !== userId) {
      throw new ApiException(403, 'COLLAB_005', '본인이 작성한 댓글만 삭제할 수 있습니다');
    }

    return this.prisma.activityComment.delete({
      where: { id: commentId },
    });
  }
}
