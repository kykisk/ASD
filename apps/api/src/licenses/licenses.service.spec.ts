import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { LicensesService } from './licenses.service';
import { LicensedToolDataService } from './licensed-tool-data.service';
import { LicensedTool, LicenseStatus } from '@auticare/prisma-client';

const mockPrisma = {
  license: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
};

const mockToolData = { createForFamily: vi.fn() };

describe('LicensesService', () => {
  let service: LicensesService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LicensesService,
        { provide: 'PrismaService', useValue: mockPrisma },
        { provide: LicensedToolDataService, useValue: mockToolData },
      ],
    }).compile();

    service = module.get<LicensesService>(LicensesService);
    Object.defineProperty(service, 'prisma', { value: mockPrisma });
    Object.defineProperty(service, 'toolDataService', { value: mockToolData });
  });

  describe('register', () => {
    it('should create license with SHA-256 hashed key', async () => {
      mockPrisma.license.findUnique.mockResolvedValue(null);
      const created = { id: 'lic-1', tool: LicensedTool.CARS_2, status: LicenseStatus.ACTIVE };
      mockPrisma.license.create.mockResolvedValue(created);
      mockToolData.createForFamily.mockResolvedValue('q-1');

      const result = await service.register({
        tool: LicensedTool.CARS_2,
        licenseKey: 'TEST-KEY-123',
        familyId: 'fam-1',
      });

      expect(result).toEqual(created);
      expect(mockPrisma.license.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tool: LicensedTool.CARS_2,
            familyId: 'fam-1',
            keyHash: expect.stringMatching(/^[a-f0-9]{64}$/),
            status: LicenseStatus.ACTIVE,
          }),
        }),
      );
      expect(mockToolData.createForFamily).toHaveBeenCalledWith(
        'fam-1',
        LicensedTool.CARS_2,
        'system',
      );
    });

    it('should throw ConflictException if license already exists', async () => {
      mockPrisma.license.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register({ tool: LicensedTool.CARS_2, licenseKey: 'KEY', familyId: 'fam-1' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('activate', () => {
    it('should update status to ACTIVE', async () => {
      mockPrisma.license.findUnique.mockResolvedValue({
        id: 'lic-1',
        status: LicenseStatus.REVOKED,
      });
      mockPrisma.license.update.mockResolvedValue({ id: 'lic-1', status: LicenseStatus.ACTIVE });
      mockPrisma.license.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.activate('lic-1');
      expect(result.status).toBe(LicenseStatus.ACTIVE);
    });

    it('should throw NotFoundException if license not found', async () => {
      mockPrisma.license.findUnique.mockResolvedValue(null);
      await expect(service.activate('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('revoke', () => {
    it('should update status to REVOKED', async () => {
      mockPrisma.license.findUnique.mockResolvedValue({
        id: 'lic-1',
        status: LicenseStatus.ACTIVE,
      });
      mockPrisma.license.update.mockResolvedValue({ id: 'lic-1', status: LicenseStatus.REVOKED });
      mockPrisma.license.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.revoke('lic-1');
      expect(result.status).toBe(LicenseStatus.REVOKED);
    });
  });

  describe('validateLicense', () => {
    it('should return true for ACTIVE license', async () => {
      mockPrisma.license.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.license.findUnique.mockResolvedValue({
        id: 'lic-1',
        status: LicenseStatus.ACTIVE,
      });

      const result = await service.validateLicense('fam-1', LicensedTool.CARS_2);
      expect(result).toBe(true);
    });

    it('should return false for EXPIRED license', async () => {
      mockPrisma.license.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.license.findUnique.mockResolvedValue({
        id: 'lic-1',
        status: LicenseStatus.EXPIRED,
      });

      const result = await service.validateLicense('fam-1', LicensedTool.CARS_2);
      expect(result).toBe(false);
    });

    it('should return false when no license exists', async () => {
      mockPrisma.license.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.license.findUnique.mockResolvedValue(null);

      const result = await service.validateLicense('fam-1', LicensedTool.M_CHAT_R_F);
      expect(result).toBe(false);
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException if license not found', async () => {
      mockPrisma.license.findUnique.mockResolvedValue(null);
      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
    });

    it('should delete the license', async () => {
      mockPrisma.license.findUnique.mockResolvedValue({ id: 'lic-1' });
      mockPrisma.license.delete.mockResolvedValue({ id: 'lic-1' });

      await service.remove('lic-1');
      expect(mockPrisma.license.delete).toHaveBeenCalledWith({ where: { id: 'lic-1' } });
    });
  });
});
