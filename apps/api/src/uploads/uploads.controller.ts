import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { UploadsService } from './uploads.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

interface PresignRequestBody {
  fileName: string;
  contentType: string;
}

interface RecordAttachmentBody {
  s3Key: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

@Controller()
export class UploadsController {
  constructor(private uploadsService: UploadsService) {}

  @Post('assessments/:assessmentId/media/presign')
  async getPresignedUrl(
    @CurrentUser() user: { id: string; familyId: string },
    @Param('assessmentId') assessmentId: string,
    @Body() body: PresignRequestBody,
  ) {
    return this.uploadsService.getPresignedUploadUrl(
      user.familyId,
      assessmentId,
      body.fileName,
      body.contentType,
    );
  }

  @Post('assessments/:assessmentId/media')
  async recordAttachment(
    @Param('assessmentId') assessmentId: string,
    @Body() body: RecordAttachmentBody,
  ) {
    return this.uploadsService.recordAttachment(
      assessmentId,
      body.s3Key,
      body.fileName,
      body.fileType,
      body.fileSize,
    );
  }

  @Get('media/:attachmentId/url')
  async getDownloadUrl(
    @Param('attachmentId') attachmentId: string,
  ) {
    const attachment = await this.uploadsService.findAttachment(attachmentId);
    return { downloadUrl: await this.uploadsService.getPresignedDownloadUrl(attachment.s3Key) };
  }

  @Delete('media/:attachmentId')
  async deleteAttachment(
    @CurrentUser() user: { id: string },
    @Param('attachmentId') attachmentId: string,
  ) {
    await this.uploadsService.deleteAttachment(attachmentId, user.id);
    return { success: true };
  }
}
