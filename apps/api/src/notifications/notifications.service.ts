import { Injectable } from '@nestjs/common';
import { PrismaService } from '@auticare/prisma-client';
import type { Notification, NotificationType } from '@prisma/client';
import { PushService } from './push.service.js';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private pushService: PushService,
  ) {}

  async create(params: {
    userId: string;
    childId?: string;
    type: NotificationType;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }): Promise<Notification> {
    const notification = await this.prisma.notification.create({
      data: {
        userId: params.userId,
        childId: params.childId ?? null,
        type: params.type,
        title: params.title,
        body: params.body,
        data: params.data ?? undefined,
      },
    });

    const pushData = params.data
      ? Object.fromEntries(
          Object.entries(params.data)
            .filter(([, v]) => v !== null && v !== undefined)
            .map(([k, v]) => [k, String(v)]),
        )
      : undefined;

    this.pushService
      .sendToUser(params.userId, {
        title: params.title,
        body: params.body,
        data: pushData,
      })
      .catch(() => {});

    return notification;
  }

  async findForUser(
    userId: string,
    options?: { unreadOnly?: boolean; limit?: number },
  ): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(options?.unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 50,
    });
  }

  async markRead(notificationId: string, userId: string): Promise<void> {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      return;
    }

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }
}
