import { Injectable } from '@nestjs/common';
import { PrismaService } from '@auticare/prisma-client';
import { AiTier, UserRole } from '@prisma/client';
import { ApiException } from '../common/exceptions/api.exception.js';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(params?: {
    search?: string;
    role?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (params?.search) {
      where.OR = [
        { email: { contains: params.search, mode: 'insensitive' } },
        { name: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    if (params?.role) where.role = params.role;
    if (params?.status === 'active') where.isActive = true;
    if (params?.status === 'inactive') where.isActive = false;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data: users, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async updateUserRole(userId: string, role: string) {
    const validRoles = Object.values(UserRole);
    if (!validRoles.includes(role as UserRole)) {
      throw new ApiException(400, 'USER_001', `유효하지 않은 역할입니다: ${role}`);
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { role: role as UserRole },
      select: { id: true, email: true, name: true, role: true },
    });
  }

  async toggleUserStatus(userId: string, isActive: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: { id: true, email: true, name: true, isActive: true },
    });
  }

  async listFamilies() {
    const families = await this.prisma.family.findMany({
      include: {
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return families.map((f) => ({
      id: f.id,
      name: f.name,
      aiTier: f.aiTier,
      memberCount: f._count.members,
      createdAt: f.createdAt,
    }));
  }

  async updateFamilyTier(familyId: string, aiTier: string) {
    const validTiers: string[] = Object.values(AiTier);
    if (!validTiers.includes(aiTier)) {
      throw new ApiException(400, 'FAMILY_001', `유효하지 않은 AI 티어입니다: ${aiTier}`);
    }

    const family = await this.prisma.family.findUnique({ where: { id: familyId } });
    if (!family) {
      throw new ApiException(404, 'FAMILY_404', '가족을 찾을 수 없습니다');
    }

    return this.prisma.family.update({
      where: { id: familyId },
      data: { aiTier: aiTier as AiTier },
      select: { id: true, name: true, aiTier: true },
    });
  }

  async listBatchJobs(params?: { type?: string; status?: string; limit?: number }) {
    const limit = params?.limit ?? 30;
    const where: Record<string, unknown> = {};
    if (params?.type) where.type = params.type;
    if (params?.status) where.status = params.status;

    return this.prisma.batchJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        type: true,
        status: true,
        totalItems: true,
        processedItems: true,
        failedItems: true,
        errors: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
        targetDate: true,
      },
    });
  }

  /** 감사 로그: 최신순, 리소스·작업 필터 */
  async listAuditLogs(params: {
    resource?: string;
    action?: string;
    page?: number;
    limit?: number;
  }) {
    const limit = Math.min(params.limit ?? 50, 200);
    const page = Math.max(params.page ?? 1, 1);
    const where: Record<string, unknown> = {};
    if (params.resource) where['resource'] = params.resource;
    if (params.action) where['action'] = params.action;
    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { email: true, name: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return {
      data: rows.map((r) => ({
        id: r.id,
        createdAt: r.createdAt,
        action: r.action,
        resource: r.resource,
        resourceId: r.resourceId,
        userEmail: r.user?.email ?? null,
        userName: r.user?.name ?? null,
        ipAddress: r.ipAddress,
      })),
      meta: { page, limit, total },
    };
  }

  /** 질문지: 모든 가족의 질문지 (시스템이 만든 '일일 발달 체크', 'AI 발달 추출' 포함) */
  async listQuestionnaires() {
    const rows = await this.prisma.questionnaire.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        family: { select: { name: true } },
        _count: { select: { items: true, assessments: true } },
      },
    });
    return rows.map((q) => ({
      id: q.id,
      name: q.name,
      type: q.type,
      licensedTool: q.licensedTool,
      familyName: q.family.name,
      isActive: q.isActive,
      itemCount: q._count.items,
      assessmentCount: q._count.assessments,
      createdAt: q.createdAt,
    }));
  }

  async getQuestionnaireItems(id: string) {
    return this.prisma.questionnaireItem.findMany({
      where: { questionnaireId: id },
      orderBy: { orderIndex: 'asc' },
      select: { id: true, domain: true, text: true, orderIndex: true },
    });
  }

  async setQuestionnaireActive(id: string, isActive: boolean) {
    return this.prisma.questionnaire.update({
      where: { id },
      data: { isActive },
      select: { id: true, isActive: true },
    });
  }

  /** 논문: 요약 상태와 몇 가족에게 추천됐는지 */
  async listResearchArticles(params: { missingSummaryOnly?: boolean; limit?: number }) {
    const rows = await this.prisma.researchArticle.findMany({
      where: params.missingSummaryOnly ? { koreanSummary: null } : undefined,
      orderBy: { fetchedAt: 'desc' },
      take: Math.min(params.limit ?? 100, 300),
      include: { _count: { select: { userMatches: true } } },
    });
    const missing = await this.prisma.researchArticle.count({ where: { koreanSummary: null } });
    return {
      missingSummaries: missing,
      data: rows.map((a) => ({
        id: a.id,
        pubmedId: a.pubmedId,
        title: a.title,
        journal: a.journal,
        publishedAt: a.publishedAt,
        fetchedAt: a.fetchedAt,
        hasSummary: !!a.koreanSummary,
        koreanSummary: a.koreanSummary,
        matchedFamilies: a._count.userMatches,
      })),
    };
  }

  /**
   * 오늘 하루 기록 · 쭉 적기 품질 (최근 days 일). 원문은 돌려주지 않고 건수와 비율만
   */
  async dailyRecordQuality(days = 7) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const entries = await this.prisma.dailyRecordEntry.findMany({
      where: { createdAt: { gte: since } },
      select: { mode: true, status: true, edited: true, questionCount: true, answeredCount: true },
    });
    const freeform = entries.filter((e) => e.mode === 'FREEFORM');
    const saved = freeform.filter((e) => e.status === 'SAVED');
    const questions = saved.reduce((n, e) => n + e.questionCount, 0);
    const answered = saved.reduce((n, e) => n + e.answeredCount, 0);
    const ratio = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : null);
    const recorded = entries.filter((e) => e.status !== 'DRAFT');
    return {
      days,
      freeformRecords: freeform.filter((e) => e.status !== 'DRAFT').length,
      detailedRecords: entries.filter((e) => e.mode === 'DETAILED').length,
      /** 쭉 적기로 남긴 비율 (확인 전에 그만둔 것은 빼고) */
      freeformShare: ratio(recorded.filter((e) => e.mode === 'FREEFORM').length, recorded.length),
      /** 부모가 AI 정리를 고친 비율 */
      editedRate: ratio(saved.filter((e) => e.edited).length, saved.length),
      /** 추가 질문에 답한 비율 */
      answerRate: ratio(answered, questions),
      /** AI 정리 후 확인하지 않고 나간 수 */
      abandoned: freeform.filter((e) => e.status === 'DRAFT').length,
      failed: freeform.filter((e) => e.status === 'FAILED' || e.status === 'RECOVERED').length,
    };
  }
}
