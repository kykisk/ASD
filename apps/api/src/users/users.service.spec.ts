import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { ApiException } from '../common/exceptions/api.exception';

const mockPrismaService = {
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: 'PrismaService', useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    Object.defineProperty(service, 'prisma', { value: mockPrismaService });
  });

  describe('getProfile', () => {
    it('should return user data', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: '홍길동',
        role: 'FAMILY_ADMIN',
        phone: '010-1234-5678',
        lastLoginAt: new Date(),
        createdAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getProfile('user-1');

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          lastLoginAt: true,
          createdAt: true,
        },
      });
    });

    it('should throw USER_404 for non-existent user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('non-existent')).rejects.toThrow(
        ApiException,
      );
      await expect(service.getProfile('non-existent')).rejects.toMatchObject({
        statusCode: 404,
        code: 'USER_404',
      });
    });
  });

  describe('updateProfile', () => {
    it('should update and return new data', async () => {
      const updatedUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: '김철수',
        role: 'FAMILY_ADMIN',
        phone: '010-9876-5432',
        lastLoginAt: new Date(),
        createdAt: new Date(),
      };

      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateProfile('user-1', {
        name: '김철수',
        phone: '010-9876-5432',
      });

      expect(result).toEqual(updatedUser);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { name: '김철수', phone: '010-9876-5432' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          lastLoginAt: true,
          createdAt: true,
        },
      });
    });
  });
});
