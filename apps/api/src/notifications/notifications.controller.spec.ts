import { NotificationsController } from './notifications.controller';

const mockNotificationsService = {
  findForUser: vi.fn(),
  getUnreadCount: vi.fn(),
  markAllRead: vi.fn(),
  markRead: vi.fn(),
};

const mockPushService = {
  registerToken: vi.fn(),
  unregisterToken: vi.fn(),
};

const mockUser = { id: 'user-1' };

describe('NotificationsController', () => {
  let controller: NotificationsController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new NotificationsController(
      mockNotificationsService as any,
      mockPushService as any,
    );
  });

  describe('list()', () => {
    it('기본 파라미터로 알림 목록 반환', async () => {
      const notifications = [{ id: 'n-1' }, { id: 'n-2' }];
      mockNotificationsService.findForUser.mockResolvedValue(notifications);

      const result = await controller.list(mockUser);

      expect(result).toEqual(notifications);
      expect(mockNotificationsService.findForUser).toHaveBeenCalledWith('user-1', {
        unreadOnly: false,
        limit: undefined,
      });
    });

    it('unreadOnly=true 쿼리 파라미터 처리', async () => {
      mockNotificationsService.findForUser.mockResolvedValue([]);
      await controller.list(mockUser, 'true');
      expect(mockNotificationsService.findForUser).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ unreadOnly: true }),
      );
    });

    it('limit 쿼리 파라미터 숫자로 변환', async () => {
      mockNotificationsService.findForUser.mockResolvedValue([]);
      await controller.list(mockUser, 'false', '10');
      expect(mockNotificationsService.findForUser).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ limit: 10 }),
      );
    });
  });

  describe('getUnreadCount()', () => {
    it('읽지 않은 알림 수 반환', async () => {
      mockNotificationsService.getUnreadCount.mockResolvedValue(3);

      const result = await controller.getUnreadCount(mockUser);

      expect(result).toEqual({ count: 3 });
      expect(mockNotificationsService.getUnreadCount).toHaveBeenCalledWith('user-1');
    });

    it('읽지 않은 알림 없으면 0', async () => {
      mockNotificationsService.getUnreadCount.mockResolvedValue(0);
      const result = await controller.getUnreadCount(mockUser);
      expect(result).toEqual({ count: 0 });
    });
  });

  describe('markAllRead()', () => {
    it('모든 알림 읽음 처리 후 success 반환', async () => {
      mockNotificationsService.markAllRead.mockResolvedValue(undefined);

      const result = await controller.markAllRead(mockUser);

      expect(result).toEqual({ success: true });
      expect(mockNotificationsService.markAllRead).toHaveBeenCalledWith('user-1');
    });
  });

  describe('markRead()', () => {
    it('특정 알림 읽음 처리', async () => {
      mockNotificationsService.markRead.mockResolvedValue(undefined);

      const result = await controller.markRead('notif-1', mockUser);

      expect(result).toEqual({ success: true });
      expect(mockNotificationsService.markRead).toHaveBeenCalledWith('notif-1', 'user-1');
    });

    it('존재하지 않는 알림도 success 반환 (서비스가 silently skip)', async () => {
      mockNotificationsService.markRead.mockResolvedValue(undefined);
      const result = await controller.markRead('not-exist', mockUser);
      expect(result).toEqual({ success: true });
    });
  });

  describe('registerDeviceToken()', () => {
    it('iOS 토큰 등록 후 success 반환', async () => {
      mockPushService.registerToken.mockResolvedValue(undefined);

      const result = await controller.registerDeviceToken(mockUser, {
        token: 'fcm-token-ios',
        platform: 'IOS',
      } as any);

      expect(result).toEqual({ success: true });
      expect(mockPushService.registerToken).toHaveBeenCalledWith('user-1', 'fcm-token-ios', 'IOS');
    });

    it('Android 토큰 등록', async () => {
      mockPushService.registerToken.mockResolvedValue(undefined);

      await controller.registerDeviceToken(mockUser, {
        token: 'fcm-token-android',
        platform: 'ANDROID',
      } as any);

      expect(mockPushService.registerToken).toHaveBeenCalledWith(
        'user-1',
        'fcm-token-android',
        'ANDROID',
      );
    });
  });

  describe('unregisterDeviceToken()', () => {
    it('토큰 해제 후 success 반환', async () => {
      mockPushService.unregisterToken.mockResolvedValue(undefined);

      const result = await controller.unregisterDeviceToken(mockUser, {
        token: 'fcm-token-ios',
      } as any);

      expect(result).toEqual({ success: true });
      expect(mockPushService.unregisterToken).toHaveBeenCalledWith('user-1', 'fcm-token-ios');
    });
  });
});
