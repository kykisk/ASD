import { Test, TestingModule } from '@nestjs/testing';
import { NotificationTriggerService } from './notification-trigger.service';

const mockNotificationsService = {
  create: vi.fn(),
};

const mockPrismaService = {
  familyMember: { findMany: vi.fn() },
  assessment: { findFirst: vi.fn() },
  activityLog: { findFirst: vi.fn() },
};

describe('NotificationTriggerService', () => {
  let service: NotificationTriggerService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationTriggerService,
        { provide: 'NotificationsService', useValue: mockNotificationsService },
        { provide: 'PrismaService', useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<NotificationTriggerService>(NotificationTriggerService);
    Object.defineProperty(service, 'notificationsService', { value: mockNotificationsService });
    Object.defineProperty(service, 'prisma', { value: mockPrismaService });
  });

  describe('triggerCurriculumReady', () => {
    it('should create notifications for all family members', async () => {
      mockPrismaService.familyMember.findMany.mockResolvedValue([
        { userId: 'user-1' },
        { userId: 'user-2' },
      ]);
      mockNotificationsService.create.mockResolvedValue({});

      await service.triggerCurriculumReady('child-1', 'family-1');

      expect(mockNotificationsService.create).toHaveBeenCalledTimes(2);
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          childId: 'child-1',
          type: 'CURRICULUM_READY',
          title: '커리큘럼 준비 완료',
          body: '오늘의 커리큘럼이 준비됐어요',
        }),
      );
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-2',
          childId: 'child-1',
          type: 'CURRICULUM_READY',
        }),
      );
    });

    it('should do nothing if no family members found', async () => {
      mockPrismaService.familyMember.findMany.mockResolvedValue([]);

      await service.triggerCurriculumReady('child-1', 'family-1');

      expect(mockNotificationsService.create).not.toHaveBeenCalled();
    });
  });

  describe('triggerAssessmentReminder', () => {
    it('should not send if recent assessment exists', async () => {
      mockPrismaService.assessment.findFirst.mockResolvedValue({ id: 'a-1' });

      await service.triggerAssessmentReminder('child-1', 'family-1');

      expect(mockNotificationsService.create).not.toHaveBeenCalled();
    });

    it('should send reminder if no recent assessment', async () => {
      mockPrismaService.assessment.findFirst.mockResolvedValue(null);
      mockPrismaService.familyMember.findMany.mockResolvedValue([{ userId: 'user-1' }]);
      mockNotificationsService.create.mockResolvedValue({});

      await service.triggerAssessmentReminder('child-1', 'family-1');

      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ASSESSMENT_DUE',
          body: '오늘 평가를 기록해보세요',
        }),
      );
    });
  });

  describe('triggerInputReminder', () => {
    it('should not send if recent activity log exists', async () => {
      mockPrismaService.activityLog.findFirst.mockResolvedValue({ id: 'log-1' });

      await service.triggerInputReminder('child-1', 'family-1');

      expect(mockNotificationsService.create).not.toHaveBeenCalled();
    });

    it('should send reminder if no recent activity', async () => {
      mockPrismaService.activityLog.findFirst.mockResolvedValue(null);
      mockPrismaService.familyMember.findMany.mockResolvedValue([{ userId: 'user-1' }]);
      mockNotificationsService.create.mockResolvedValue({});

      await service.triggerInputReminder('child-1', 'family-1');

      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'INPUT_REMINDER',
          body: '활동 기록을 남겨보세요',
        }),
      );
    });
  });

  describe('triggerWeeklyInsightReady', () => {
    it('should create notifications for all family members', async () => {
      mockPrismaService.familyMember.findMany.mockResolvedValue([
        { userId: 'user-1' },
      ]);
      mockNotificationsService.create.mockResolvedValue({});

      await service.triggerWeeklyInsightReady('child-1', 'family-1');

      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'WEEKLY_INSIGHT_READY',
          body: '이번 주 성장 분석이 준비됐어요',
        }),
      );
    });
  });
});
