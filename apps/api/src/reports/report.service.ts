import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@auticare/prisma-client';
import { EncryptionService } from '@auticare/encryption';
import { DomainAggregationService } from '../assessments/domain-aggregation.service.js';
import { ApiException } from '../common/exceptions/api.exception.js';

export interface ReportData {
  child: { name: string; birthDate: string; ageMonths: number };
  period: { year: number; month: number; label: string };
  domainScores: { domain: string; label: string; percentage: number; trend: string }[];
  assessmentCount: number;
  assessmentDates: string[];
  curriculumCount: number;
  curriculumCompletionRate: number;
  topStrengths: string[];
  focusAreas: string[];
}

const DOMAIN_LABELS: Record<string, string> = {
  COMMUNICATION: '의사소통',
  SOCIAL: '사회성',
  MOTOR: '운동',
  COGNITIVE: '인지',
  EMOTIONAL: '정서',
  DAILY_LIVING: '일상생활',
  OTHER: '기타',
};

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
    private domainAggregation: DomainAggregationService,
  ) {}

  async generateMonthlyReport(params: {
    childId: string;
    userId: string;
    year: number;
    month: number;
  }): Promise<{ html: string; pdfBuffer?: Buffer }> {
    const { childId, userId, year, month } = params;

    const child = await this.prisma.child.findUnique({ where: { id: childId } });
    if (!child) {
      throw new ApiException(404, 'CHILD_404', '아이를 찾을 수 없습니다');
    }

    await this.verifyFamilyMember(child.familyId, userId);

    const data = await this.buildReportData(childId, year, month);
    const html = this.buildHtmlTemplate(data);

    let pdfBuffer: Buffer | undefined;
    try {
      const result = await this.renderPdf(html);
      if (result) {
        pdfBuffer = result;
      }
    } catch (err) {
      this.logger.warn('PDF rendering failed, returning HTML only', err);
    }

    await this.prisma.report.upsert({
      where: { childId_year_month: { childId, year, month } },
      create: { childId, familyId: child.familyId, year, month, htmlContent: html },
      update: { htmlContent: html },
    });

    return { html, pdfBuffer };
  }

  async listReports(childId: string, userId: string) {
    const child = await this.prisma.child.findUnique({ where: { id: childId } });
    if (!child) throw new ApiException(404, 'CHILD_404', '아이를 찾을 수 없습니다');
    await this.verifyFamilyMember(child.familyId, userId);

    return this.prisma.report.findMany({
      where: { childId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      select: { id: true, year: true, month: true, createdAt: true },
    });
  }

  async getReport(reportId: string, userId: string) {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new ApiException(404, 'REPORT_404', '보고서를 찾을 수 없습니다');
    await this.verifyFamilyMember(report.familyId, userId);
    return report;
  }

  async buildReportData(childId: string, year: number, month: number): Promise<ReportData> {
    const child = await this.prisma.child.findUnique({ where: { id: childId } });
    if (!child) {
      throw new ApiException(404, 'CHILD_404', '아이를 찾을 수 없습니다');
    }

    const pii = await this.encryptionService.decryptPii({
      ciphertext: child.nameEnc,
      iv: child.encIv,
      authTag: child.encAuthTag,
      salt: child.encSalt,
    });

    const birthDate = new Date(pii.birthDate);
    const now = new Date();
    const ageMonths =
      (now.getFullYear() - birthDate.getFullYear()) * 12 + (now.getMonth() - birthDate.getMonth());

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const assessments = await this.prisma.assessment.findMany({
      where: {
        childId,
        completedAt: { not: null },
        createdAt: { gte: startDate, lte: endDate },
      },
      orderBy: { createdAt: 'desc' },
      include: { scores: true },
    });

    const assessmentDates = assessments.map((a) => a.createdAt.toISOString().split('T')[0]);

    const curricula = await this.prisma.curriculum.findMany({
      where: {
        childId,
        date: { gte: startDate, lte: endDate },
      },
    });

    const curriculumCount = curricula.length;
    const completedCurricula = curricula.filter((c) => c.status === 'COMPLETED');
    const curriculumCompletionRate =
      curriculumCount > 0 ? Math.round((completedCurricula.length / curriculumCount) * 100) : 0;

    const itemWeights = new Map<string, number>();
    for (const a of assessments) {
      for (const s of a.scores) {
        if (!itemWeights.has(s.itemId)) {
          itemWeights.set(s.itemId, 1.0);
        }
      }
    }

    const aggregated = this.domainAggregation.aggregate(
      assessments.map((a) => ({
        id: a.id,
        createdAt: a.createdAt,
        scores: a.scores.map((s) => ({ domain: s.domain, score: s.score, itemId: s.itemId })),
      })),
      itemWeights,
    );

    const domainScores = aggregated.domains.map((d) => ({
      domain: d.domain,
      label: d.label,
      percentage: d.percentage,
      trend: d.trend.direction,
    }));

    const sortedDomains = [...domainScores].sort((a, b) => b.percentage - a.percentage);
    const topStrengths = sortedDomains.slice(0, 2).map((d) => d.label);
    const focusAreas = sortedDomains
      .filter((d) => d.percentage < 60)
      .slice(0, 2)
      .map((d) => d.label);

    const monthLabel = `${year}년 ${month}월`;

    return {
      child: { name: pii.name, birthDate: pii.birthDate, ageMonths: Math.max(0, ageMonths) },
      period: { year, month, label: monthLabel },
      domainScores,
      assessmentCount: assessments.length,
      assessmentDates,
      curriculumCount,
      curriculumCompletionRate,
      topStrengths,
      focusAreas,
    };
  }

  buildHtmlTemplate(data: ReportData): string {
    const domainBars = data.domainScores
      .map(
        (d) => `
      <div class="domain-row">
        <div class="domain-label">${d.label}</div>
        <div class="domain-bar-container">
          <div class="domain-bar" style="width: ${Math.min(100, d.percentage)}%"></div>
        </div>
        <div class="domain-value">${d.percentage.toFixed(0)}%</div>
        <div class="domain-trend ${d.trend === 'UP' ? 'trend-up' : d.trend === 'DOWN' ? 'trend-down' : 'trend-stable'}">
          ${d.trend === 'UP' ? '↑' : d.trend === 'DOWN' ? '↓' : '→'}
        </div>
      </div>
    `,
      )
      .join('');

    const assessmentChart =
      data.assessmentDates.length > 0
        ? data.assessmentDates
            .slice(0, 10)
            .map(
              (date) => `
        <div class="chart-bar">
          <div class="chart-bar-fill"></div>
          <div class="chart-bar-label">${date.slice(5)}</div>
        </div>
      `,
            )
            .join('')
        : '<p class="no-data">이 기간에 평가 기록이 없습니다.</p>';

    return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.child.name} - ${data.period.label} 보고서</title>
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', sans-serif;
      color: #2C3E50;
      background: #FDFBF7;
      line-height: 1.6;
      font-size: 14px;
    }

    .page {
      width: 21cm;
      min-height: 29.7cm;
      margin: 0 auto;
      padding: 20mm;
      background: white;
    }

    .cover {
      text-align: center;
      padding: 60px 0;
      border-bottom: 3px solid #5B8A72;
      margin-bottom: 40px;
    }

    .cover h1 {
      font-size: 28px;
      color: #5B8A72;
      margin-bottom: 12px;
    }

    .cover .subtitle {
      font-size: 18px;
      color: #6B7B8D;
    }

    .cover .child-info {
      margin-top: 24px;
      font-size: 16px;
      color: #2C3E50;
    }

    .section {
      margin-bottom: 32px;
    }

    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: #5B8A72;
      border-left: 4px solid #5B8A72;
      padding-left: 12px;
      margin-bottom: 16px;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }

    .summary-card {
      background: #E8F5EE;
      border-radius: 12px;
      padding: 16px;
      text-align: center;
    }

    .summary-card .value {
      font-size: 24px;
      font-weight: 700;
      color: #3D6B54;
    }

    .summary-card .label {
      font-size: 12px;
      color: #6B7B8D;
      margin-top: 4px;
    }

    .domain-row {
      display: flex;
      align-items: center;
      margin-bottom: 12px;
      gap: 12px;
    }

    .domain-label {
      width: 80px;
      font-size: 13px;
      font-weight: 600;
      color: #2C3E50;
    }

    .domain-bar-container {
      flex: 1;
      height: 20px;
      background: #E8E4DF;
      border-radius: 10px;
      overflow: hidden;
    }

    .domain-bar {
      height: 100%;
      background: linear-gradient(90deg, #5B8A72, #7BC67E);
      border-radius: 10px;
      transition: width 0.3s;
    }

    .domain-value {
      width: 40px;
      text-align: right;
      font-size: 13px;
      font-weight: 600;
      color: #3D6B54;
    }

    .domain-trend {
      width: 24px;
      text-align: center;
      font-size: 16px;
    }

    .trend-up { color: #7BC67E; }
    .trend-down { color: #E88B8B; }
    .trend-stable { color: #94A3B4; }

    .chart-container {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      height: 80px;
      padding: 8px 0;
    }

    .chart-bar {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      height: 100%;
      justify-content: flex-end;
    }

    .chart-bar-fill {
      width: 100%;
      max-width: 32px;
      height: 60%;
      background: #5B8A72;
      border-radius: 4px 4px 0 0;
    }

    .chart-bar-label {
      font-size: 10px;
      color: #6B7B8D;
      margin-top: 4px;
      white-space: nowrap;
    }

    .no-data {
      color: #94A3B4;
      font-style: italic;
      padding: 16px;
      text-align: center;
    }

    .strengths-list, .focus-list {
      list-style: none;
      padding: 0;
    }

    .strengths-list li::before {
      content: '✓ ';
      color: #7BC67E;
      font-weight: 700;
    }

    .focus-list li::before {
      content: '→ ';
      color: #F0A86E;
      font-weight: 700;
    }

    .strengths-list li, .focus-list li {
      padding: 6px 0;
      font-size: 14px;
    }

    .footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid #E8E4DF;
      text-align: center;
      font-size: 11px;
      color: #94A3B4;
    }

    @media print {
      body { background: white; }
      .page { margin: 0; padding: 15mm; box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="cover">
      <h1>월간 성장 보고서</h1>
      <div class="subtitle">${data.period.label}</div>
      <div class="child-info">
        ${data.child.name} (${data.child.ageMonths}개월)
      </div>
    </div>

    <div class="section">
      <div class="section-title">요약</div>
      <div class="summary-grid">
        <div class="summary-card">
          <div class="value">${data.assessmentCount}</div>
          <div class="label">평가 횟수</div>
        </div>
        <div class="summary-card">
          <div class="value">${data.curriculumCount}</div>
          <div class="label">커리큘럼 수</div>
        </div>
        <div class="summary-card">
          <div class="value">${data.curriculumCompletionRate}%</div>
          <div class="label">커리큘럼 완료율</div>
        </div>
        <div class="summary-card">
          <div class="value">${data.domainScores.length}</div>
          <div class="label">평가 영역</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">영역별 발달 현황</div>
      ${domainBars || '<p class="no-data">아직 영역별 데이터가 없습니다.</p>'}
    </div>

    <div class="section">
      <div class="section-title">평가 일정</div>
      <div class="chart-container">
        ${assessmentChart}
      </div>
    </div>

    <div class="section">
      <div class="section-title">강점 영역</div>
      ${
        data.topStrengths.length > 0
          ? `<ul class="strengths-list">${data.topStrengths.map((s) => `<li>${s}</li>`).join('')}</ul>`
          : '<p class="no-data">데이터가 충분하지 않습니다.</p>'
      }
    </div>

    <div class="section">
      <div class="section-title">집중 필요 영역</div>
      ${
        data.focusAreas.length > 0
          ? `<ul class="focus-list">${data.focusAreas.map((s) => `<li>${s}</li>`).join('')}</ul>`
          : '<p class="no-data">모든 영역이 잘 진행되고 있어요!</p>'
      }
    </div>

    <div class="footer">
      AutiCare | 이 보고서는 자동 생성되었습니다 | ${new Date().toISOString().split('T')[0]}
    </div>
  </div>
</body>
</html>`;
  }

  private async renderPdf(html: string): Promise<Buffer | null> {
    try {
      const puppeteer = await import('puppeteer-core');
      const executablePath = this.findChromePath();
      if (!executablePath) {
        this.logger.warn('Chrome/Chromium not found, skipping PDF generation');
        return null;
      }

      const browser = await puppeteer.default.launch({
        executablePath,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });

      try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdf = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
        });
        return Buffer.from(pdf);
      } finally {
        await browser.close();
      }
    } catch (err) {
      this.logger.warn('Puppeteer PDF generation failed', err);
      return null;
    }
  }

  private findChromePath(): string | null {
    const paths = [
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    ];

    const { accessSync } = require('node:fs') as typeof import('node:fs');
    for (const p of paths) {
      try {
        accessSync(p);
        return p;
      } catch {
        continue;
      }
    }
    return null;
  }

  private async verifyFamilyMember(familyId: string, userId: string) {
    const membership = await this.prisma.familyMember.findUnique({
      where: { userId_familyId: { userId, familyId } },
    });

    if (!membership) {
      throw new ApiException(403, 'FORBIDDEN', '가족 구성원이 아닙니다');
    }

    return membership;
  }
}
