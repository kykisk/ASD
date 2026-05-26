import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';

const mockPrismaService = {
  notification: {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
  },
};

const mockPushService = {
  sendToUser: vi.fn().mockResolvedValue(undefined),
  isEnabled: false,
};

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: 'PrismaService', useValue: mockPrismaService },
        { provide: 'PushService', useValue: mockPushService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    Object.defineProperty(service, 'prisma', { value: mockPrismaService });
    Object.defineProperty(service, 'pushService', { value: mockPushService });
  });

  describe('create', () => {
    it('should create a notification', async () => {
      const mockNotification = {
        id: 'notif-1',
        userId: 'user-1',
        childId: 'child-1',
        type: 'CURRICULUM_READY',
        title: '커리큘럼 준비',
        body: '오늘의 커리큘럼이 준비됐어요',
        data: null,
        isRead: false,
        readAt: null,
        createdAt: new Date(),
      };
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);

      const result = await service.create({
        userId: 'user-1',
        childId: 'child-1',
        type: 'CURRICULUM_READY',
        title: '커리큘럼 준비',
        body: '오늘의 커리큘럼이 준비됐어요',
      });

      expect(result).toEqual(mockNotification);
      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          type: 'CURRICULUM_READY',
        }),
      });
    });
  });

  describe('findForUser', () => {
    it('should return notifications for user', async () => {
      const notifications = [{ id: 'notif-1' }, { id: 'notif-2' }];
      mockPrismaService.notification.findMany.mockResolvedValue(notifications);

      const result = await service.findForUser('user-1');

      expect(result).toHaveLength(2);
      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should filter unread only', async () => {
      mockPrismaService.notification.findMany.mockResolvedValue([]);

      await service.findForUser('user-1', { unreadOnly: true });

      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', isRead: false },
        }),
      );
    });

    it('should respect limit option', async () => {
      mockPrismaService.notification.findMany.mockResolvedValue([]);

      await service.findForUser('user-1', { limit: 10 });

      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
    });
  });

  describe('markRead', () => {
    it('should mark notification as read', async () => {
      mockPrismaService.notification.findFirst.mockResolvedValue({
        id: 'notif-1',
        userId: 'user-1',
      });
      mockPrismaService.notification.update.mockResolvedValue({});

      await service.markRead('notif-1', 'user-1');

      expect(mockPrismaService.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: expect.objectContaining({ isRead: true }),
      });
    });

    it('should not update if notification not found or not owned', async () => {
      mockPrismaService.notification.findFirst.mockResolvedValue(null);

      await service.markRead('notif-1', 'user-1');

      expect(mockPrismaService.notification.update).not.toHaveBeenCalled();
    });
  });

  describe('markAllRead', () => {
    it('should mark all unread notifications as read', async () => {
      mockPrismaService.notification.updateMany.mockResolvedValue({ count: 3 });

      await service.markAllRead('user-1');

      expect(mockPrismaService.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
        data: expect.objectContaining({ isRead: true }),
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread notification count', async () => {
      mockPrismaService.notification.count.mockResolvedValue(5);

      const result = await service.getUnreadCount('user-1');

      expect(result).toBe(5);
      expect(mockPrismaService.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
      });
    });
  });
});
