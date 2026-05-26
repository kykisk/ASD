import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PushService } from './push.service';

const { mockSendEachForMulticast } = vi.hoisted(() => ({
  mockSendEachForMulticast: vi.fn(),
}));

vi.mock('firebase-admin', () => ({
  apps: [],
  initializeApp: vi.fn(() => ({ name: '[DEFAULT]' })),
  app: vi.fn(() => ({ name: '[DEFAULT]' })),
  credential: { cert: vi.fn(() => ({})) },
  messaging: vi.fn(() => ({ sendEachForMulticast: mockSendEachForMulticast })),
}));

const mockPrismaService = {
  deviceToken: {
    upsert: vi.fn(),
    deleteMany: vi.fn(),
    findMany: vi.fn(),
  },
};

const makeConfigService = (values: Record<string, string | undefined>) => ({
  get: vi.fn((key: string) => values[key]),
});

describe('PushService', () => {
  let service: PushService;

  const buildService = async (envValues: Record<string, string | undefined> = {}) => {
    vi.clearAllMocks();
    const configMock = makeConfigService(envValues);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PushService,
        { provide: ConfigService, useValue: configMock },
        { provide: 'PrismaService', useValue: mockPrismaService },
      ],
    }).compile();
    const svc = module.get<PushService>(PushService);
    Object.defineProperty(svc, 'prisma', { value: mockPrismaService, writable: true });
    Object.defineProperty(svc, 'config', { value: configMock, writable: true });
    return svc;
  };

  describe('onModuleInit', () => {
    it('FCM 자격증명 없으면 비활성화 상태 유지', async () => {
      service = await buildService({});
      service.onModuleInit();
      expect(service.isEnabled).toBe(false);
    });

    it('일부 자격증명 누락 시 비활성화', async () => {
      service = await buildService({ FCM_PROJECT_ID: 'proj-id' });
      service.onModuleInit();
      expect(service.isEnabled).toBe(false);
    });

    it('자격증명 모두 있으면 초기화 성공', async () => {
      const admin = await import('firebase-admin');
      service = await buildService({
        FCM_PROJECT_ID: 'proj-id',
        FCM_PRIVATE_KEY: 'key',
        FCM_CLIENT_EMAIL: 'email@test.com',
      });
      service.onModuleInit();
      expect(admin.initializeApp).toHaveBeenCalled();
    });
  });

  describe('isEnabled', () => {
    it('app이 null이면 false', async () => {
      service = await buildService({});
      service.onModuleInit();
      expect(service.isEnabled).toBe(false);
    });

    it('app이 설정되면 true', async () => {
      service = await buildService({});
      Object.defineProperty(service, 'app', { value: { name: '[DEFAULT]' }, writable: true });
      expect(service.isEnabled).toBe(true);
    });
  });

  describe('registerToken', () => {
    beforeEach(async () => {
      service = await buildService({});
      Object.defineProperty(service, 'app', { value: null, writable: true });
    });

    it('새 토큰을 upsert로 저장', async () => {
      mockPrismaService.deviceToken.upsert.mockResolvedValue({});
      await service.registerToken('user-1', 'fcm-token-abc', 'IOS');
      expect(mockPrismaService.deviceToken.upsert).toHaveBeenCalledWith({
        where: { token: 'fcm-token-abc' },
        update: expect.objectContaining({ userId: 'user-1', platform: 'IOS' }),
        create: { userId: 'user-1', token: 'fcm-token-abc', platform: 'IOS' },
      });
    });

    it('같은 토큰이면 userId/platform을 업데이트', async () => {
      mockPrismaService.deviceToken.upsert.mockResolvedValue({});
      await service.registerToken('user-2', 'fcm-token-abc', 'ANDROID');
      expect(mockPrismaService.deviceToken.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ userId: 'user-2', platform: 'ANDROID' }),
        }),
      );
    });
  });

  describe('unregisterToken', () => {
    beforeEach(async () => {
      service = await buildService({});
    });

    it('해당 userId+token 쌍만 삭제', async () => {
      mockPrismaService.deviceToken.deleteMany.mockResolvedValue({ count: 1 });
      await service.unregisterToken('user-1', 'fcm-token-abc');
      expect(mockPrismaService.deviceToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', token: 'fcm-token-abc' },
      });
    });

    it('존재하지 않는 토큰이어도 에러 없음', async () => {
      mockPrismaService.deviceToken.deleteMany.mockResolvedValue({ count: 0 });
      await expect(service.unregisterToken('user-1', 'not-exist')).resolves.toBeUndefined();
    });
  });

  describe('sendToUser', () => {
    beforeEach(async () => {
      service = await buildService({});
    });

    it('FCM 비활성화 시 전송 없이 즉시 반환', async () => {
      Object.defineProperty(service, 'app', { value: null, writable: true });
      await service.sendToUser('user-1', { title: '제목', body: '내용' });
      expect(mockPrismaService.deviceToken.findMany).not.toHaveBeenCalled();
    });

    it('디바이스 토큰 없으면 전송 생략', async () => {
      Object.defineProperty(service, 'app', { value: { name: '[DEFAULT]' }, writable: true });
      mockPrismaService.deviceToken.findMany.mockResolvedValue([]);
      await service.sendToUser('user-1', { title: '제목', body: '내용' });
      expect(mockSendEachForMulticast).not.toHaveBeenCalled();
    });

    it('토큰이 있으면 multicast 전송', async () => {
      Object.defineProperty(service, 'app', { value: { name: '[DEFAULT]' }, writable: true });
      mockPrismaService.deviceToken.findMany.mockResolvedValue([
        { token: 'token-ios-1' },
        { token: 'token-android-1' },
      ]);
      mockSendEachForMulticast.mockResolvedValue({
        successCount: 2,
        failureCount: 0,
        responses: [{ success: true }, { success: true }],
      });

      await service.sendToUser('user-1', {
        title: '커리큘럼 준비',
        body: '오늘의 커리큘럼이 준비됐어요',
        data: { type: 'CURRICULUM_READY', childId: 'child-1' },
      });

      expect(mockSendEachForMulticast).toHaveBeenCalledWith(
        expect.objectContaining({
          tokens: ['token-ios-1', 'token-android-1'],
          notification: { title: '커리큘럼 준비', body: '오늘의 커리큘럼이 준비됐어요' },
        }),
      );
    });

    it('만료/무효 토큰을 자동 삭제', async () => {
      Object.defineProperty(service, 'app', { value: { name: '[DEFAULT]' }, writable: true });
      mockPrismaService.deviceToken.findMany.mockResolvedValue([
        { token: 'valid-token' },
        { token: 'stale-token' },
        { token: 'invalid-token' },
      ]);
      mockSendEachForMulticast.mockResolvedValue({
        successCount: 1,
        failureCount: 2,
        responses: [
          { success: true },
          { success: false, error: { code: 'messaging/registration-token-not-registered' } },
          { success: false, error: { code: 'messaging/invalid-registration-token' } },
        ],
      });
      mockPrismaService.deviceToken.deleteMany.mockResolvedValue({ count: 2 });

      await service.sendToUser('user-1', { title: '알림', body: '내용' });

      expect(mockPrismaService.deviceToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', token: { in: ['stale-token', 'invalid-token'] } },
      });
    });

    it('네트워크 오류 시 에러 던지지 않고 로그만', async () => {
      Object.defineProperty(service, 'app', { value: { name: '[DEFAULT]' }, writable: true });
      mockPrismaService.deviceToken.findMany.mockResolvedValue([{ token: 'token-1' }]);
      mockSendEachForMulticast.mockRejectedValue(new Error('FCM network error'));

      await expect(
        service.sendToUser('user-1', { title: '알림', body: '내용' }),
      ).resolves.toBeUndefined();
    });

    it('일반 실패 토큰은 삭제 안 함', async () => {
      Object.defineProperty(service, 'app', { value: { name: '[DEFAULT]' }, writable: true });
      mockPrismaService.deviceToken.findMany.mockResolvedValue([{ token: 'token-1' }]);
      mockSendEachForMulticast.mockResolvedValue({
        successCount: 0,
        failureCount: 1,
        responses: [{ success: false, error: { code: 'messaging/internal-error' } }],
      });

      await service.sendToUser('user-1', { title: '알림', body: '내용' });

      expect(mockPrismaService.deviceToken.deleteMany).not.toHaveBeenCalled();
    });
  });
});
