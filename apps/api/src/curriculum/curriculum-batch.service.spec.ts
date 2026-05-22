import { Test, TestingModule } from '@nestjs/testing';
import { CurriculumBatchService } from './curriculum-batch.service';

const mockPrismaService = {
  batchJob: {
    create: vi.fn(),
    update: vi.fn(),
  },
  familyMember: {
    findMany: vi.fn(),
  },
  child: {
    findMany: vi.fn(),
  },
};

const mockCurriculumService = {
  generateForChild: vi.fn(),
};

const mockNotificationTrigger = {
  triggerAssessmentReminder: vi.fn().mockResolvedValue(undefined),
  triggerInputReminder: vi.fn().mockResolvedValue(undefined),
};

describe('CurriculumBatchService', () => {
  let service: CurriculumBatchService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CurriculumBatchService,
        { provide: 'PrismaService', useValue: mockPrismaService },
        { provide: 'CurriculumService', useValue: mockCurriculumService },
        { provide: 'NotificationTriggerService', useValue: mockNotificationTrigger },
      ],
    }).compile();

    service = module.get<CurriculumBatchService>(CurriculumBatchService);
    Object.defineProperty(service, 'prisma', { value: mockPrismaService });
    Object.defineProperty(service, 'curriculumService', { value: mockCurriculumService });
    Object.defineProperty(service, 'notificationTrigger', { value: mockNotificationTrigger });
  });

  describe('runNightlyGeneration', () => {
    it('should create BatchJob, process children, update counts', async () => {
      mockPrismaService.batchJob.create.mockResolvedValue({ id: 'batch-1' });
      mockPrismaService.familyMember.findMany.mockResolvedValue([
        { userId: 'user-1', familyId: 'family-1' },
        { userId: 'user-2', familyId: 'family-2' },
      ]);
      mockPrismaService.child.findMany.mockResolvedValue([
        { id: 'child-1', familyId: 'family-1' },
        { id: 'child-2', familyId: 'family-2' },
      ]);
      mockCurriculumService.generateForChild.mockResolvedValue({ id: 'curr-1' });
      mockPrismaService.batchJob.update.mockResolvedValue({});

      const result = await service.runNightlyGeneration();

      expect(mockPrismaService.batchJob.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'CURRICULUM_GENERATION',
            status: 'RUNNING',
          }),
        }),
      );
      expect(result.totalChildren).toBe(2);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(mockPrismaService.batchJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'COMPLETED' }),
        }),
      );
    });

    it('should continue on individual child failure', async () => {
      mockPrismaService.batchJob.create.mockResolvedValue({ id: 'batch-1' });
      mockPrismaService.familyMember.findMany.mockResolvedValue([
        { userId: 'user-1', familyId: 'family-1' },
      ]);
      mockPrismaService.child.findMany.mockResolvedValue([
        { id: 'child-1', familyId: 'family-1' },
        { id: 'child-2', familyId: 'family-1' },
      ]);
      mockCurriculumService.generateForChild
        .mockRejectedValueOnce(new Error('AI failed'))
        .mockRejectedValueOnce(new Error('AI failed'))
        .mockRejectedValueOnce(new Error('AI failed'))
        .mockResolvedValueOnce({ id: 'curr-2' });
      mockPrismaService.batchJob.update.mockResolvedValue({});

      Object.defineProperty(service, 'delay', { value: () => Promise.resolve() });

      const result = await service.runNightlyGeneration();

      expect(result.totalChildren).toBe(2);
      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].childId).toBe('child-1');
    });

    it('should handle empty children list', async () => {
      mockPrismaService.batchJob.create.mockResolvedValue({ id: 'batch-1' });
      mockPrismaService.familyMember.findMany.mockResolvedValue([]);
      mockPrismaService.child.findMany.mockResolvedValue([]);
      mockPrismaService.batchJob.update.mockResolvedValue({});

      const result = await service.runNightlyGeneration();

      expect(result.totalChildren).toBe(0);
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(0);
    });
  });

  describe('triggerManualGeneration', () => {
    it('should call curriculumService.generateForChild', async () => {
      const mockResult = { id: 'curr-1' };
      mockCurriculumService.generateForChild.mockResolvedValue(mockResult);

      const result = await service.triggerManualGeneration('child-1', 'user-1');

      expect(mockCurriculumService.generateForChild).toHaveBeenCalledWith('child-1', 'user-1');
      expect(result).toEqual(mockResult);
    });
  });
});
