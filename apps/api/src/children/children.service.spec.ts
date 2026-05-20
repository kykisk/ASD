import { Test, TestingModule } from '@nestjs/testing';
import { ChildrenService } from './children.service';
import { ApiException } from '../common/exceptions/api.exception';

const mockEncryptedPayload = {
  ciphertext: 'encrypted-ciphertext',
  iv: 'encrypted-iv',
  authTag: 'encrypted-authTag',
  salt: 'encrypted-salt',
};

const mockDecryptedPii = {
  name: '홍길동',
  birthDate: '2020-01-15',
};

const mockPrismaService = {
  child: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  familyMember: {
    findUnique: vi.fn(),
  },
};

const mockEncryptionService = {
  encryptPii: vi.fn().mockResolvedValue(mockEncryptedPayload),
  decryptPii: vi.fn().mockResolvedValue(mockDecryptedPii),
};

const now = new Date();

const mockChildRecord = {
  id: 'child-1',
  familyId: 'family-1',
  nameEnc: 'encrypted-ciphertext',
  encIv: 'encrypted-iv',
  encAuthTag: 'encrypted-authTag',
  encSalt: 'encrypted-salt',
  encVersion: 1,
  gender: 'MALE',
  diagnosisName: null,
  diagnosisDate: null,
  notes: null,
  createdAt: now,
  updatedAt: now,
};

const mockMembership = {
  id: 'member-1',
  userId: 'user-1',
  familyId: 'family-1',
  role: 'FAMILY_ADMIN',
  joinedAt: now,
};

describe('ChildrenService', () => {
  let service: ChildrenService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChildrenService,
        { provide: 'PrismaService', useValue: mockPrismaService },
        { provide: 'EncryptionService', useValue: mockEncryptionService },
      ],
    }).compile();

    service = module.get<ChildrenService>(ChildrenService);
    Object.defineProperty(service, 'prisma', { value: mockPrismaService });
    Object.defineProperty(service, 'encryptionService', {
      value: mockEncryptionService,
    });
  });

  describe('create', () => {
    it('should encrypt PII and store ciphertext', async () => {
      mockPrismaService.familyMember.findUnique.mockResolvedValue(mockMembership);
      mockPrismaService.child.create.mockResolvedValue(mockChildRecord);

      const result = await service.create('family-1', 'user-1', {
        name: '홍길동',
        birthDate: '2020-01-15',
        gender: 'MALE',
      });

      expect(mockEncryptionService.encryptPii).toHaveBeenCalledWith({
        name: '홍길동',
        birthDate: '2020-01-15',
      });

      expect(mockPrismaService.child.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-1',
          nameEnc: 'encrypted-ciphertext',
          encIv: 'encrypted-iv',
          encAuthTag: 'encrypted-authTag',
          encSalt: 'encrypted-salt',
          gender: 'MALE',
          diagnosisName: null,
          diagnosisDate: null,
          notes: null,
        },
      });

      expect(result.name).toBe('홍길동');
      expect(result.birthDate).toBe('2020-01-15');
      expect(result).not.toHaveProperty('nameEnc');
      expect(result).not.toHaveProperty('encIv');
    });
  });

  describe('findByFamily', () => {
    it('should decrypt all children', async () => {
      mockPrismaService.familyMember.findUnique.mockResolvedValue(mockMembership);
      mockPrismaService.child.findMany.mockResolvedValue([
        mockChildRecord,
        { ...mockChildRecord, id: 'child-2' },
      ]);

      const result = await service.findByFamily('family-1', 'user-1');

      expect(result).toHaveLength(2);
      expect(mockEncryptionService.decryptPii).toHaveBeenCalledTimes(2);
      expect(result[0].name).toBe('홍길동');
      expect(result[1].name).toBe('홍길동');
    });
  });

  describe('findOne', () => {
    it('should decrypt single child', async () => {
      mockPrismaService.child.findUnique.mockResolvedValue(mockChildRecord);
      mockPrismaService.familyMember.findUnique.mockResolvedValue(mockMembership);

      const result = await service.findOne('child-1', 'user-1');

      expect(result.name).toBe('홍길동');
      expect(result.birthDate).toBe('2020-01-15');
      expect(result.id).toBe('child-1');
      expect(mockEncryptionService.decryptPii).toHaveBeenCalledWith({
        ciphertext: 'encrypted-ciphertext',
        iv: 'encrypted-iv',
        authTag: 'encrypted-authTag',
        salt: 'encrypted-salt',
      });
    });

    it('should throw CHILD_404 for non-existent child', async () => {
      mockPrismaService.child.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent', 'user-1')).rejects.toMatchObject({
        statusCode: 404,
        code: 'CHILD_404',
      });
    });
  });

  describe('update', () => {
    it('should re-encrypt when name changes', async () => {
      mockPrismaService.child.findUnique.mockResolvedValue(mockChildRecord);
      mockPrismaService.familyMember.findUnique.mockResolvedValue(mockMembership);
      mockPrismaService.child.update.mockResolvedValue(mockChildRecord);

      await service.update('child-1', 'user-1', { name: '김철수' });

      expect(mockEncryptionService.decryptPii).toHaveBeenCalledWith({
        ciphertext: 'encrypted-ciphertext',
        iv: 'encrypted-iv',
        authTag: 'encrypted-authTag',
        salt: 'encrypted-salt',
      });

      expect(mockEncryptionService.encryptPii).toHaveBeenCalledWith({
        name: '김철수',
        birthDate: '2020-01-15',
      });

      expect(mockPrismaService.child.update).toHaveBeenCalledWith({
        where: { id: 'child-1' },
        data: expect.objectContaining({
          nameEnc: 'encrypted-ciphertext',
          encIv: 'encrypted-iv',
          encAuthTag: 'encrypted-authTag',
          encSalt: 'encrypted-salt',
        }),
      });
    });

    it('should not re-encrypt when only non-PII fields change', async () => {
      mockPrismaService.child.findUnique.mockResolvedValue(mockChildRecord);
      mockPrismaService.familyMember.findUnique.mockResolvedValue(mockMembership);
      mockPrismaService.child.update.mockResolvedValue(mockChildRecord);

      await service.update('child-1', 'user-1', { notes: 'new note' });

      expect(mockEncryptionService.encryptPii).not.toHaveBeenCalled();
      expect(mockPrismaService.child.update).toHaveBeenCalledWith({
        where: { id: 'child-1' },
        data: { notes: 'new note' },
      });
    });
  });

  describe('access control', () => {
    it('should throw FORBIDDEN if user is not in family', async () => {
      mockPrismaService.familyMember.findUnique.mockResolvedValue(null);

      await expect(
        service.create('family-1', 'stranger', {
          name: '홍길동',
          birthDate: '2020-01-15',
        }),
      ).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    });

    it('should throw FORBIDDEN on delete if user is not FAMILY_ADMIN', async () => {
      mockPrismaService.child.findUnique.mockResolvedValue(mockChildRecord);
      mockPrismaService.familyMember.findUnique.mockResolvedValue({
        ...mockMembership,
        role: 'FAMILY_MEMBER',
      });

      await expect(service.remove('child-1', 'user-1')).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    });
  });
});
