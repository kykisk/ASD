import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { ClinicalReportsService, CreateClinicalReportInput } from './clinical-reports.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { FamilyResolverService } from '../common/services/family-resolver.service.js';

@Controller()
export class ClinicalReportsController {
  constructor(
    private readonly service: ClinicalReportsService,
    private readonly familyResolver: FamilyResolverService,
  ) {}

  @Get('children/:childId/clinical-reports')
  async findByChild(@Param('childId') childId: string) {
    return this.service.findByChild(childId);
  }

  @Post('children/:childId/clinical-reports')
  async create(@Param('childId') childId: string, @Body() input: CreateClinicalReportInput) {
    return this.service.create(childId, { ...input, source: 'MANUAL' });
  }

  @Post('children/:childId/clinical-reports/from-image')
  async createFromImage(
    @Param('childId') childId: string,
    @Body() body: { images: Array<{ base64: string; mimeType: string }> },
  ) {
    if (!body.images?.length) {
      throw new (await import('../common/exceptions/api.exception.js')).ApiException(
        400,
        'REPORT_001',
        '이미지를 1장 이상 업로드해주세요',
      );
    }
    const extraction = await this.service.extractFromImage(body.images);
    return { extraction, childId };
  }

  @Delete('clinical-reports/:id')
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return { message: '보고서가 삭제되었습니다' };
  }
}
