import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaService } from '@auticare/prisma-client';
import { ApiException } from '../common/exceptions/api.exception.js';
import { randomUUID } from 'crypto';

export interface PresignedUploadResponse {
  uploadUrl: string;
  s3Key: string;
  s3Bucket: string;
  expiresAt: Date;
}

const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/quicktime',
] as const;

@Injectable()
export class UploadsService {
  private s3Client: S3Client;
  private bucket: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.bucket = this.configService.get('AWS_S3_BUCKET', 'auticare-uploads');
    this.s3Client = new S3Client({
      region: this.configService.get('AWS_S3_REGION', 'ap-northeast-2'),
      credentials: {
        accessKeyId: this.configService.get('AWS_S3_ACCESS_KEY_ID', ''),
        secretAccessKey: this.configService.get('AWS_S3_SECRET_ACCESS_KEY', ''),
      },
    });
  }

  async getPresignedUploadUrl(
    familyId: string,
    assessmentId: string,
    fileName: string,
    contentType: string,
  ): Promise<PresignedUploadResponse> {
    if (!ALLOWED_CONTENT_TYPES.includes(contentType as (typeof ALLOWED_CONTENT_TYPES)[number])) {
      throw new ApiException(
        400,
        'INVALID_CONTENT_TYPE',
        `지원하지 않는 파일 형식입니다: ${contentType}`,
      );
    }

    const ext = fileName.split('.').pop() ?? 'bin';
    const s3Key = `families/${familyId}/assessments/${assessmentId}/${randomUUID()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 300 });
    const expiresAt = new Date(Date.now() + 300 * 1000);

    return { uploadUrl, s3Key, s3Bucket: this.bucket, expiresAt };
  }

  async getPresignedDownloadUrl(s3Key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
  }

  async recordAttachment(
    assessmentId: string,
    s3Key: string,
    fileName: string,
    fileType: string,
    fileSize: number,
  ) {
    return this.prisma.mediaAttachment.create({
      data: {
        assessmentId,
        s3Key,
        s3Bucket: this.bucket,
        fileName,
        fileType,
        fileSize,
      },
    });
  }

  async findAttachment(attachmentId: string) {
    const attachment = await this.prisma.mediaAttachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      throw new ApiException(404, 'ATTACHMENT_404', '첨부 파일을 찾을 수 없습니다');
    }

    return attachment;
  }

  async deleteAttachment(attachmentId: string, userId: string): Promise<void> {
    const attachment = await this.prisma.mediaAttachment.findUnique({
      where: { id: attachmentId },
      include: { assessment: true },
    });

    if (!attachment) {
      throw new ApiException(404, 'ATTACHMENT_404', '첨부 파일을 찾을 수 없습니다');
    }

    const membership = await this.prisma.familyMember.findUnique({
      where: {
        userId_familyId: { userId, familyId: attachment.assessment.familyId },
      },
    });

    if (!membership) {
      throw new ApiException(403, 'FORBIDDEN', '가족 구성원이 아닙니다');
    }

    const deleteCommand = new DeleteObjectCommand({
      Bucket: attachment.s3Bucket,
      Key: attachment.s3Key,
    });

    await this.s3Client.send(deleteCommand);
    await this.prisma.mediaAttachment.delete({ where: { id: attachmentId } });
  }
}
