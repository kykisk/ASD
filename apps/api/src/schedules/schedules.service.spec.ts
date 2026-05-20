import { Test, TestingModule } from '@nestjs/testing';
import { SchedulesService } from './schedules.service';
import { ApiException } from '../common/exceptions/api.exception';
import { CacheService } from '../common/cache/cache.service';
import type { Schedule } from '@prisma/client';

const now = new Date('2024-06-01T00:00:00.000Z');

const mockPrismaService = {
  schedule: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  child: {
    findUnique: vi.fn(),
  },
  familyMember: {
    findUnique: vi.fn(),
  },
};

const mockMembership = {
  id: 'member-1',
  userId: 'user-1',
  familyId: 'family-1',
  role: 'FAMILY_ADMIN',
  joinedAt: now,
};

const mockChild = {
  id: 'child-1',
  familyId: 'family-1',
};

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

describe('SchedulesService', () => {
  let service: SchedulesService;

  const mockCacheService = {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    del: vi.fn().mockResolvedValue(undefined),
    delByPattern: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulesService,
        { provide: 'PrismaService', useValue: mockPrismaService },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<SchedulesService>(SchedulesService);
    Object.defineProperty(service, 'prisma', { value: mockPrismaService });
    Object.defineProperty(service, 'cacheService', { value: mockCacheService });
  });

  describe('create', () => {
    it('should create schedule with valid data', async () => {
      mockPrismaService.familyMember.findUnique.mockResolvedValue(mockMembership);
      mockPrismaService.child.findUnique.mockResolvedValue(mockChild);
      const expected = createMockSchedule();
      mockPrismaService.schedule.create.mockResolvedValue(expected);

      const result = await service.create('child-1', 'family-1', 'user-1', {
        title: '치료 시간',
        category: 'THERAPY',
        startTime: '2024-06-10T09:00:00.000Z',
        endTime: '2024-06-10T10:00:00.000Z',
      });

      expect(result).toEqual(expected);
      expect(mockPrismaService.schedule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          childId: 'child-1',
          familyId: 'family-1',
          title: '치료 시간',
          category: 'THERAPY',
        }),
      });
    });
  });

  describe('findByChild', () => {
    it('should return schedules in date range', async () => {
      mockPrismaService.child.findUnique.mockResolvedValue(mockChild);
      mockPrismaService.familyMember.findUnique.mockResolvedValue(mockMembership);
      const schedule = createMockSchedule();
      mockPrismaService.schedule.findMany.mockResolvedValue([schedule]);

      const result = await service.findByChild('child-1', 'user-1', {
        startDate: '2024-06-01T00:00:00.000Z',
        endDate: '2024-06-30T23:59:59.000Z',
      });

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('치료 시간');
    });
  });

  describe('expandRecurrences - DAILY', () => {
    it('should generate daily instances within range', () => {
      const schedule = createMockSchedule({
        recurrenceType: 'DAILY',
        startTime: new Date('2024-06-01T09:00:00.000Z'),
        endTime: new Date('2024-06-01T10:00:00.000Z'),
      });

      const startDate = new Date('2024-06-01T00:00:00.000Z');
      const endDate = new Date('2024-06-04T00:00:00.000Z');

      const result = service.expandRecurrences(schedule, startDate, endDate);

      expect(result).toHaveLength(3);
      expect(result[0].startTime).toEqual(new Date('2024-06-01T09:00:00.000Z'));
      expect(result[1].startTime).toEqual(new Date('2024-06-02T09:00:00.000Z'));
      expect(result[2].startTime).toEqual(new Date('2024-06-03T09:00:00.000Z'));
      expect(result[0].isRecurrenceInstance).toBe(true);
    });

    it('should respect interval for daily recurrence', () => {
      const schedule = createMockSchedule({
        recurrenceType: 'DAILY',
        startTime: new Date('2024-06-01T09:00:00.000Z'),
        endTime: new Date('2024-06-01T10:00:00.000Z'),
        recurrenceRule: { interval: 2 },
      });

      const startDate = new Date('2024-06-01T00:00:00.000Z');
      const endDate = new Date('2024-06-06T00:00:00.000Z');

      const result = service.expandRecurrences(schedule, startDate, endDate);

      expect(result).toHaveLength(3);
      expect(result[0].startTime).toEqual(new Date('2024-06-01T09:00:00.000Z'));
      expect(result[1].startTime).toEqual(new Date('2024-06-03T09:00:00.000Z'));
      expect(result[2].startTime).toEqual(new Date('2024-06-05T09:00:00.000Z'));
    });
  });

  describe('expandRecurrences - WEEKLY', () => {
    it('should generate weekly instances', () => {
      const schedule = createMockSchedule({
        recurrenceType: 'WEEKLY',
        startTime: new Date('2024-06-03T09:00:00.000Z'),
        endTime: new Date('2024-06-03T10:00:00.000Z'),
      });

      const startDate = new Date('2024-06-01T00:00:00.000Z');
      const endDate = new Date('2024-06-24T00:00:00.000Z');

      const result = service.expandRecurrences(schedule, startDate, endDate);

      expect(result).toHaveLength(3);
      expect(result[0].startTime).toEqual(new Date('2024-06-03T09:00:00.000Z'));
      expect(result[1].startTime).toEqual(new Date('2024-06-10T09:00:00.000Z'));
      expect(result[2].startTime).toEqual(new Date('2024-06-17T09:00:00.000Z'));
    });
  });

  describe('expandRecurrences - SPECIFIC_DAYS', () => {
    it('should generate for specific days only', () => {
      const schedule = createMockSchedule({
        recurrenceType: 'SPECIFIC_DAYS',
        startTime: new Date('2024-06-03T09:00:00.000Z'),
        endTime: new Date('2024-06-03T10:00:00.000Z'),
        recurrenceRule: { daysOfWeek: [1, 3, 5] },
      });

      const startDate = new Date('2024-06-03T00:00:00.000Z');
      const endDate = new Date('2024-06-08T00:00:00.000Z');

      const result = service.expandRecurrences(schedule, startDate, endDate);

      for (const occ of result) {
        const day = occ.startTime.getDay();
        expect([1, 3, 5]).toContain(day);
      }

      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('access control', () => {
    it('should throw FORBIDDEN if user is not in family', async () => {
      mockPrismaService.child.findUnique.mockResolvedValue(mockChild);
      mockPrismaService.familyMember.findUnique.mockResolvedValue(null);

      await expect(
        service.findByChild('child-1', 'stranger', {
          startDate: '2024-06-01T00:00:00.000Z',
          endDate: '2024-06-30T23:59:59.000Z',
        }),
      ).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    });
  });
});
