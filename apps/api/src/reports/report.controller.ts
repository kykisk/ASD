import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Res,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { ReportService } from './report.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

interface GenerateReportBody {
  year: number;
  month: number;
}

@Controller()
export class ReportController {
  constructor(private reportService: ReportService) {}

  @Post('children/:childId/reports/monthly')
  async generateMonthly(
    @CurrentUser() user: { id: string },
    @Param('childId') childId: string,
    @Body() body: GenerateReportBody,
  ) {
    const { year, month } = body;
    const result = await this.reportService.generateMonthlyReport({
      childId,
      userId: user.id,
      year,
      month,
    });

    return {
      year,
      month,
      format: result.pdfBuffer ? 'pdf' : 'html',
      html: result.html,
      hasPdf: !!result.pdfBuffer,
    };
  }

  @Get('children/:childId/reports')
  async listReports(
    @CurrentUser() user: { id: string },
    @Param('childId') childId: string,
  ) {
    return [];
  }

  @Get('reports/:reportId/download')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async downloadReport(
    @CurrentUser() user: { id: string },
    @Param('reportId') reportId: string,
    @Res() res: Response,
  ) {
    res.status(404).json({
      success: false,
      error: { code: 'REPORT_404', message: '보고서를 찾을 수 없습니다' },
    });
  }
}
