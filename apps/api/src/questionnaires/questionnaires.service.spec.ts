import { Test, TestingModule } from '@nestjs/testing';
import { QuestionnairesService } from './questionnaires.service';
import { ApiException } from '../common/exceptions/api.exception';

const now = new Date('2024-06-01T00:00:00.000Z');

const mockPrismaService = {
  questionnaire: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  questionnaireItem: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  familyMember: {
    findUnique: vi.fn(),
  },
  $transaction: vi.fn(),
};

const mockMembership = {
  id: 'member-1',
  userId: 'user-1',
  familyId: 'family-1',
  role: 'FAMILY_ADMIN',
  joinedAt: now,
};

const mockQuestionnaire = {
  id: 'q-1',
  familyId: 'family-1',
  type: 'NON_LICENSED_USER_INPUT',
  name: '의사소통 평가',
  description: '기본 의사소통 능력 평가',
  domains: ['COMMUNICATION', 'SOCIAL'],
  isActive: true,
  createdBy: 'user-1',
  createdAt: now,
  updatedAt: now,
  items: [
    {
      id: 'item-1',
      questionnaireId: 'q-1',
      domain: 'COMMUNICATION',
      text: '눈 맞춤을 합니까?',
      description: null,
      orderIndex: 0,
      weight: 1.0,
      createdAt: now,
    },
    {
      id: 'item-2',
      questionnaireId: 'q-1',
      domain: 'SOCIAL',
      text: '또래와 놀이를 합니까?',
      description: null,
      orderIndex: 1,
      weight: 1.0,
      createdAt: now,
    },
  ],
};

describe('QuestionnairesService', () => {
  let service: QuestionnairesService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionnairesService,
        { provide: 'PrismaService', useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<QuestionnairesService>(QuestionnairesService);
    Object.defineProperty(service, 'prisma', { value: mockPrismaService });
  });

  describe('create', () => {
    it('should create questionnaire with items in transaction', async () => {
      mockPrismaService.familyMember.findUnique.mockResolvedValue(mockMembership);
      mockPrismaService.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          questionnaire: {
            create: vi.fn().mockResolvedValue(mockQuestionnaire),
          },
        };
        return cb(tx);
      });

      const result = await service.create('family-1', 'user-1', {
        name: '의사소통 평가',
        description: '기본 의사소통 능력 평가',
        domains: ['COMMUNICATION', 'SOCIAL'],
        items: [
          { domain: 'COMMUNICATION', text: '눈 맞춤을 합니까?', orderIndex: 0, weight: 1.0 },
          { domain: 'SOCIAL', text: '또래와 놀이를 합니까?', orderIndex: 1, weight: 1.0 },
        ],
      });

      expect(result).toEqual(mockQuestionnaire);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return family questionnaires only', async () => {
      mockPrismaService.familyMember.findUnique.mockResolvedValue(mockMembership);
      mockPrismaService.questionnaire.findMany.mockResolvedValue([mockQuestionnaire]);

      const result = await service.findAll('family-1', 'user-1');

      expect(result).toHaveLength(1);
      expect(result[0].familyId).toBe('family-1');
      expect(mockPrismaService.questionnaire.findMany).toHaveBeenCalledWith({
        where: { familyId: 'family-1', isActive: true },
        include: { items: { orderBy: { orderIndex: 'asc' } } },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return questionnaire with items', async () => {
      mockPrismaService.questionnaire.findUnique.mockResolvedValue(mockQuestionnaire);
      mockPrismaService.familyMember.findUnique.mockResolvedValue(mockMembership);

      const result = await service.findOne('q-1', 'user-1');

      expect(result).toEqual(mockQuestionnaire);
      expect(result.items).toHaveLength(2);
      expect(mockPrismaService.questionnaire.findUnique).toHaveBeenCalledWith({
        where: { id: 'q-1' },
        include: { items: { orderBy: { orderIndex: 'asc' } } },
      });
    });
  });

  describe('addItem', () => {
    it('should append new item to questionnaire', async () => {
      const newItem = {
        id: 'item-3',
        questionnaireId: 'q-1',
        domain: 'MOTOR',
        text: '소근육 운동을 할 수 있습니까?',
        description: null,
        orderIndex: 2,
        weight: 1.5,
        createdAt: now,
      };

      mockPrismaService.questionnaire.findUnique.mockResolvedValue(mockQuestionnaire);
      mockPrismaService.familyMember.findUnique.mockResolvedValue(mockMembership);
      mockPrismaService.questionnaireItem.create.mockResolvedValue(newItem);

      const result = await service.addItem('q-1', 'user-1', {
        domain: 'MOTOR',
        text: '소근육 운동을 할 수 있습니까?',
        orderIndex: 2,
        weight: 1.5,
      });

      expect(result).toEqual(newItem);
      expect(mockPrismaService.questionnaireItem.create).toHaveBeenCalledWith({
        data: {
          questionnaireId: 'q-1',
          domain: 'MOTOR',
          text: '소근육 운동을 할 수 있습니까?',
          description: null,
          orderIndex: 2,
          weight: 1.5,
        },
      });
    });
  });

  describe('removeItem', () => {
    it('should remove item correctly', async () => {
      const itemWithQuestionnaire = {
        id: 'item-1',
        questionnaireId: 'q-1',
        questionnaire: mockQuestionnaire,
      };

      mockPrismaService.questionnaireItem.findUnique.mockResolvedValue(itemWithQuestionnaire);
      mockPrismaService.familyMember.findUnique.mockResolvedValue(mockMembership);
      mockPrismaService.questionnaireItem.delete.mockResolvedValue({ id: 'item-1' });

      const result = await service.removeItem('item-1', 'user-1');

      expect(result).toEqual({ deleted: true });
      expect(mockPrismaService.questionnaireItem.delete).toHaveBeenCalledWith({
        where: { id: 'item-1' },
      });
    });
  });

  describe('reorderItems', () => {
    it('should update orderIndex correctly', async () => {
      mockPrismaService.questionnaire.findUnique.mockResolvedValue(mockQuestionnaire);
      mockPrismaService.familyMember.findUnique.mockResolvedValue(mockMembership);
      mockPrismaService.$transaction.mockResolvedValue([]);

      const reorderedItems = [
        { ...mockQuestionnaire.items[1], orderIndex: 0 },
        { ...mockQuestionnaire.items[0], orderIndex: 1 },
      ];
      mockPrismaService.questionnaireItem.findMany.mockResolvedValue(reorderedItems);

      const result = await service.reorderItems('q-1', 'user-1', {
        items: [
          { id: 'item-2', orderIndex: 0 },
          { id: 'item-1', orderIndex: 1 },
        ],
      });

      expect(result).toEqual(reorderedItems);
      expect(result[0].orderIndex).toBe(0);
      expect(result[1].orderIndex).toBe(1);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe('access control', () => {
    it('should throw FORBIDDEN if user is not in family', async () => {
      mockPrismaService.familyMember.findUnique.mockResolvedValue(null);

      await expect(
        service.findAll('family-1', 'stranger'),
      ).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    });
  });
});
