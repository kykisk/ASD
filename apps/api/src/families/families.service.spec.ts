import { Test, TestingModule } from '@nestjs/testing';
import { FamiliesService } from './families.service';
import { ApiException } from '../common/exceptions/api.exception';

const mockPrismaService = {
  family: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  familyMember: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
};

describe('FamiliesService', () => {
  let service: FamiliesService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FamiliesService,
        { provide: 'PrismaService', useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<FamiliesService>(FamiliesService);
    Object.defineProperty(service, 'prisma', { value: mockPrismaService });
  });

  describe('create', () => {
    it('should create family and add creator as FAMILY_ADMIN', async () => {
      const mockFamily = {
        id: 'family-1',
        name: '김씨 가족',
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [
          {
            id: 'member-1',
            userId: 'user-1',
            familyId: 'family-1',
            role: 'FAMILY_ADMIN',
            joinedAt: new Date(),
            user: { id: 'user-1', email: 'test@example.com', name: '김철수' },
          },
        ],
      };

      mockPrismaService.family.create.mockResolvedValue(mockFamily);

      const result = await service.create('user-1', { name: '김씨 가족' });

      expect(result).toEqual(mockFamily);
      expect(mockPrismaService.family.create).toHaveBeenCalledWith({
        data: {
          name: '김씨 가족',
          members: {
            create: {
              userId: 'user-1',
              role: 'FAMILY_ADMIN',
            },
          },
        },
        include: {
          members: {
            include: { user: { select: { id: true, email: true, name: true } } },
          },
        },
      });
    });
  });

  describe('findMyFamilies', () => {
    it('should return only families user belongs to', async () => {
      const mockFamilies = [
        {
          id: 'family-1',
          name: '김씨 가족',
          members: [
            {
              id: 'member-1',
              userId: 'user-1',
              role: 'FAMILY_ADMIN',
              user: { id: 'user-1', email: 'test@example.com', name: '김철수' },
            },
          ],
        },
      ];

      mockPrismaService.family.findMany.mockResolvedValue(mockFamilies);

      const result = await service.findMyFamilies('user-1');

      expect(result).toEqual(mockFamilies);
      expect(mockPrismaService.family.findMany).toHaveBeenCalledWith({
        where: { members: { some: { userId: 'user-1' } } },
        include: {
          members: {
            include: { user: { select: { id: true, email: true, name: true } } },
          },
        },
      });
    });
  });

  describe('findOne', () => {
    it('should return family for members', async () => {
      const mockFamily = {
        id: 'family-1',
        name: '김씨 가족',
        members: [
          {
            id: 'member-1',
            userId: 'user-1',
            role: 'FAMILY_ADMIN',
            user: { id: 'user-1', email: 'test@example.com', name: '김철수' },
          },
        ],
      };

      mockPrismaService.family.findUnique.mockResolvedValue(mockFamily);

      const result = await service.findOne('family-1', 'user-1');

      expect(result).toEqual(mockFamily);
    });

    it('should throw FAMILY_404 for non-members', async () => {
      const mockFamily = {
        id: 'family-1',
        name: '김씨 가족',
        members: [
          {
            id: 'member-1',
            userId: 'user-2',
            role: 'FAMILY_ADMIN',
            user: { id: 'user-2', email: 'other@example.com', name: '박영희' },
          },
        ],
      };

      mockPrismaService.family.findUnique.mockResolvedValue(mockFamily);

      await expect(service.findOne('family-1', 'user-1')).rejects.toThrow(ApiException);
      await expect(service.findOne('family-1', 'user-1')).rejects.toMatchObject({
        statusCode: 404,
        code: 'FAMILY_404',
      });
    });

    it('should throw FAMILY_404 when family not found', async () => {
      mockPrismaService.family.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent', 'user-1')).rejects.toMatchObject({
        statusCode: 404,
        code: 'FAMILY_404',
      });
    });
  });

  describe('inviteMember', () => {
    it('should add new member by email', async () => {
      mockPrismaService.familyMember.findUnique
        .mockResolvedValueOnce({ userId: 'user-1', familyId: 'family-1', role: 'FAMILY_ADMIN' })
        .mockResolvedValueOnce(null);

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-2',
        email: 'new@example.com',
        name: '박영희',
      });

      const mockMember = {
        id: 'member-2',
        userId: 'user-2',
        familyId: 'family-1',
        role: 'FAMILY_MEMBER',
        user: { id: 'user-2', email: 'new@example.com', name: '박영희' },
      };

      mockPrismaService.familyMember.create.mockResolvedValue(mockMember);

      const result = await service.inviteMember('family-1', 'user-1', {
        email: 'new@example.com',
        role: 'FAMILY_MEMBER',
      });

      expect(result).toEqual(mockMember);
    });

    it('should throw USER_404 if email not found', async () => {
      mockPrismaService.familyMember.findUnique.mockResolvedValue({
        userId: 'user-1',
        familyId: 'family-1',
        role: 'FAMILY_ADMIN',
      });

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.inviteMember('family-1', 'user-1', {
          email: 'nonexist@example.com',
          role: 'FAMILY_MEMBER',
        }),
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'USER_404',
      });
    });
  });

  describe('removeMember', () => {
    it('should remove member', async () => {
      mockPrismaService.familyMember.findUnique.mockResolvedValue({
        userId: 'user-1',
        familyId: 'family-1',
        role: 'FAMILY_ADMIN',
      });

      mockPrismaService.familyMember.findFirst.mockResolvedValue({
        id: 'member-2',
        userId: 'user-2',
        familyId: 'family-1',
        role: 'FAMILY_MEMBER',
      });

      mockPrismaService.familyMember.delete.mockResolvedValue({});

      const result = await service.removeMember('family-1', 'user-1', 'member-2');

      expect(result).toEqual({ deleted: true });
      expect(mockPrismaService.familyMember.delete).toHaveBeenCalledWith({
        where: { id: 'member-2' },
      });
    });

    it('should throw CANNOT_REMOVE_SELF when trying to remove self', async () => {
      mockPrismaService.familyMember.findUnique.mockResolvedValue({
        userId: 'user-1',
        familyId: 'family-1',
        role: 'FAMILY_ADMIN',
      });

      mockPrismaService.familyMember.findFirst.mockResolvedValue({
        id: 'member-1',
        userId: 'user-1',
        familyId: 'family-1',
        role: 'FAMILY_ADMIN',
      });

      await expect(
        service.removeMember('family-1', 'user-1', 'member-1'),
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'CANNOT_REMOVE_SELF',
      });
    });
  });
});
