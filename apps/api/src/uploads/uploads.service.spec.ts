import { ConfigService } from '@nestjs/config';
import { UploadsService } from './uploads.service';
import { ApiException } from '../common/exceptions/api.exception';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@aws-sdk/client-s3', () => {
  const mockSend = vi.fn().mockResolvedValue({});
  return {
    S3Client: vi.fn().mockImplementation(() => ({ send: mockSend })),
    PutObjectCommand: vi.fn().mockImplementation((input) => ({ input })),
    GetObjectCommand: vi.fn().mockImplementation((input) => ({ input })),
    DeleteObjectCommand: vi.fn().mockImplementation((input) => ({ input })),
  };
});

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://s3.amazonaws.com/presigned-url'),
}));

describe('UploadsService', () => {
  let service: UploadsService;
  let prisma: {
    mediaAttachment: {
      create: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    familyMember: {
      findUnique: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    prisma = {
      mediaAttachment: {
        create: vi.fn(),
        findUnique: vi.fn(),
        delete: vi.fn(),
      },
      familyMember: {
        findUnique: vi.fn(),
      },
    };

    const configService = {
      get: vi.fn((key: string, defaultValue: string) => defaultValue),
    } as unknown as ConfigService;

    service = new UploadsService(configService, prisma as any);
  });

  describe('getPresignedUploadUrl', () => {
    it('should return a valid presigned URL structure', async () => {
      const result = await service.getPresignedUploadUrl(
        'family-1',
        'assessment-1',
        'photo.jpg',
        'image/jpeg',
      );

      expect(result).toHaveProperty('uploadUrl');
      expect(result).toHaveProperty('s3Key');
      expect(result).toHaveProperty('s3Bucket');
      expect(result).toHaveProperty('expiresAt');
      expect(result.uploadUrl).toBe('https://s3.amazonaws.com/presigned-url');
      expect(result.s3Key).toMatch(/^families\/family-1\/assessments\/assessment-1\/.+\.jpg$/);
      expect(result.s3Bucket).toBe('auticare-uploads');
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should reject unsupported content types', async () => {
      await expect(
        service.getPresignedUploadUrl('family-1', 'assessment-1', 'doc.pdf', 'application/pdf'),
      ).rejects.toThrow(ApiException);

      await expect(
        service.getPresignedUploadUrl('family-1', 'assessment-1', 'doc.pdf', 'application/pdf'),
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_CONTENT_TYPE',
      });
    });

    it('should accept all allowed content types', async () => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'];

      for (const type of allowedTypes) {
        const result = await service.getPresignedUploadUrl('family-1', 'assessment-1', 'file.ext', type);
        expect(result.uploadUrl).toBeDefined();
      }
    });
  });

  describe('recordAttachment', () => {
    it('should save attachment to DB correctly', async () => {
      const mockAttachment = {
        id: 'attach-1',
        assessmentId: 'assessment-1',
        s3Key: 'families/f1/assessments/a1/uuid.jpg',
        s3Bucket: 'auticare-uploads',
        fileName: 'photo.jpg',
        fileType: 'image/jpeg',
        fileSize: 1024,
        createdAt: new Date(),
      };

      prisma.mediaAttachment.create.mockResolvedValue(mockAttachment);

      const result = await service.recordAttachment(
        'assessment-1',
        'families/f1/assessments/a1/uuid.jpg',
        'photo.jpg',
        'image/jpeg',
        1024,
      );

      expect(result).toEqual(mockAttachment);
      expect(prisma.mediaAttachment.create).toHaveBeenCalledWith({
        data: {
          assessmentId: 'assessment-1',
          s3Key: 'families/f1/assessments/a1/uuid.jpg',
          s3Bucket: 'auticare-uploads',
          fileName: 'photo.jpg',
          fileType: 'image/jpeg',
          fileSize: 1024,
        },
      });
    });
  });

  describe('deleteAttachment', () => {
    it('should remove from S3 and DB', async () => {
      const mockAttachment = {
        id: 'attach-1',
        s3Key: 'families/f1/assessments/a1/uuid.jpg',
        s3Bucket: 'auticare-uploads',
        assessment: { familyId: 'family-1' },
      };

      prisma.mediaAttachment.findUnique.mockResolvedValue(mockAttachment);
      prisma.familyMember.findUnique.mockResolvedValue({ userId: 'user-1', familyId: 'family-1' });
      prisma.mediaAttachment.delete.mockResolvedValue(mockAttachment);

      await service.deleteAttachment('attach-1', 'user-1');

      expect(prisma.mediaAttachment.delete).toHaveBeenCalledWith({ where: { id: 'attach-1' } });
    });

    it('should throw 404 when attachment not found', async () => {
      prisma.mediaAttachment.findUnique.mockResolvedValue(null);

      await expect(service.deleteAttachment('nonexistent', 'user-1')).rejects.toMatchObject({
        statusCode: 404,
        code: 'ATTACHMENT_404',
      });
    });

    it('should throw 403 when user is not family member', async () => {
      const mockAttachment = {
        id: 'attach-1',
        s3Key: 'families/f1/assessments/a1/uuid.jpg',
        s3Bucket: 'auticare-uploads',
        assessment: { familyId: 'family-1' },
      };

      prisma.mediaAttachment.findUnique.mockResolvedValue(mockAttachment);
      prisma.familyMember.findUnique.mockResolvedValue(null);

      await expect(service.deleteAttachment('attach-1', 'user-1')).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    });
  });
});
