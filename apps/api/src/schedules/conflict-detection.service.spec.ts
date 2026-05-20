import { Test, TestingModule } from '@nestjs/testing';
import { ConflictDetectionService } from './conflict-detection.service';
import { SchedulesService } from './schedules.service';
import type { Schedule } from '@prisma/client';

const now = new Date('2024-06-01T00:00:00.000Z');

function createMockSchedule(overrides: Partial<Schedule> = {}): Schedule {
  return {
    id: 'schedule-1',
    childId: 'child-1',
    familyId: 'family-1',
    title: '치료 시간',
    description: null,
    category: 'THERAPY',
    startTime: new Date('2024-06-10T09:00:00.000Z'),
    endTime: new Date('2024-06-10T10:00:00.000Z'),
    isAllDay: false,
    recurrenceType: 'NONE',
    recurrenceRule: null,
    recurrenceEnd: null,
    location: null,
    notes: null,
    color: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as Schedule;
}

const mockPrismaService = {
  schedule: {
    findMany: vi.fn(),
  },
};

const mockSchedulesService = {
  expandRecurrences: vi.fn(),
};

describe('ConflictDetectionService', () => {
  let service: ConflictDetectionService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConflictDetectionService,
        { provide: 'PrismaService', useValue: mockPrismaService },
        { provide: SchedulesService, useValue: mockSchedulesService },
      ],
    }).compile();

    service = module.get<ConflictDetectionService>(ConflictDetectionService);
    Object.defineProperty(service, 'prisma', { value: mockPrismaService });
    Object.defineProperty(service, 'schedulesService', { value: mockSchedulesService });
  });

  describe('no conflict', () => {
    it('should return no conflicts for non-overlapping schedules', async () => {
      mockPrismaService.schedule.findMany.mockResolvedValue([]);

      const result = await service.detectConflicts(
        'child-1',
        new Date('2024-06-10T11:00:00.000Z'),
        new Date('2024-06-10T12:00:00.000Z'),
      );

      expect(result.hasConflict).toBe(false);
      expect(result.conflicts).toHaveLength(0);
    });
  });

  describe('exact overlap', () => {
    it('should detect exact overlap (same start and end)', async () => {
      const existing = createMockSchedule();
      mockPrismaService.schedule.findMany
        .mockResolvedValueOnce([existing])
        .mockResolvedValueOnce([]);

      const result = await service.detectConflicts(
        'child-1',
        new Date('2024-06-10T09:00:00.000Z'),
        new Date('2024-06-10T10:00:00.000Z'),
      );

      expect(result.hasConflict).toBe(true);
      expect(result.conflicts).toHaveLength(1);
    });
  });

  describe('partial overlap start', () => {
    it('should detect when new starts during existing', async () => {
      const existing = createMockSchedule();
      mockPrismaService.schedule.findMany
        .mockResolvedValueOnce([existing])
        .mockResolvedValueOnce([]);

      const result = await service.detectConflicts(
        'child-1',
        new Date('2024-06-10T09:30:00.000Z'),
        new Date('2024-06-10T10:30:00.000Z'),
      );

      expect(result.hasConflict).toBe(true);
      expect(result.conflicts).toHaveLength(1);
    });
  });

  describe('partial overlap end', () => {
    it('should detect when new ends during existing', async () => {
      const existing = createMockSchedule();
      mockPrismaService.schedule.findMany
        .mockResolvedValueOnce([existing])
        .mockResolvedValueOnce([]);

      const result = await service.detectConflicts(
        'child-1',
        new Date('2024-06-10T08:30:00.000Z'),
        new Date('2024-06-10T09:30:00.000Z'),
      );

      expect(result.hasConflict).toBe(true);
      expect(result.conflicts).toHaveLength(1);
    });
  });

  describe('contained', () => {
    it('should detect when new is entirely within existing', async () => {
      const existing = createMockSchedule({
        startTime: new Date('2024-06-10T08:00:00.000Z'),
        endTime: new Date('2024-06-10T12:00:00.000Z'),
      });
      mockPrismaService.schedule.findMany
        .mockResolvedValueOnce([existing])
        .mockResolvedValueOnce([]);

      const result = await service.detectConflicts(
        'child-1',
        new Date('2024-06-10T09:00:00.000Z'),
        new Date('2024-06-10T10:00:00.000Z'),
      );

      expect(result.hasConflict).toBe(true);
      expect(result.conflicts).toHaveLength(1);
    });
  });

  describe('adjacent (not a conflict)', () => {
    it('should NOT detect adjacent schedules as conflicts', async () => {
      mockPrismaService.schedule.findMany.mockResolvedValue([]);

      const result = await service.detectConflicts(
        'child-1',
        new Date('2024-06-10T10:00:00.000Z'),
        new Date('2024-06-10T11:00:00.000Z'),
      );

      expect(result.hasConflict).toBe(false);
      expect(result.conflicts).toHaveLength(0);
    });
  });

  describe('excludeId', () => {
    it('should exclude specified schedule from conflict check', async () => {
      mockPrismaService.schedule.findMany.mockResolvedValue([]);

      await service.detectConflicts(
        'child-1',
        new Date('2024-06-10T09:00:00.000Z'),
        new Date('2024-06-10T10:00:00.000Z'),
        'schedule-1',
      );

      expect(mockPrismaService.schedule.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          id: { not: 'schedule-1' },
        }),
      });
    });
  });
});
