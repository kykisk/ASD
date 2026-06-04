import { Controller, Post, Get, Param, Body, Res, Header } from '@nestjs/common';
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
  async listReports(@CurrentUser() user: { id: string }, @Param('childId') childId: string) {
    return this.reportService.listReports(childId, user.id);
  }

  @Get('reports/:reportId')
  async getReport(
    @CurrentUser() user: { id: string },
    @Param('reportId') reportId: string,
    @Res() res: Response,
  ) {
    const report = await this.reportService.getReport(reportId, user.id);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(report.htmlContent);
  }
}
