import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '@auticare/prisma-client';
import { LicensedTool, LicenseStatus } from '@auticare/prisma-client';
import { LicensedToolDataService } from './licensed-tool-data.service.js';

export interface RegisterLicenseInput {
  tool: LicensedTool;
  licenseKey: string;
  familyId: string;
  expiresAt?: Date;
  notes?: string;
  registeredBy?: string;
}

@Injectable()
export class LicensesService {
  private readonly logger = new Logger(LicensesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly toolDataService: LicensedToolDataService,
  ) {}

  private hashKey(key: string): string {
    return createHash('sha256').update(key.trim()).digest('hex');
  }

  async register(input: RegisterLicenseInput) {
    const existing = await this.prisma.license.findUnique({
      where: { tool_familyId: { tool: input.tool, familyId: input.familyId } },
    });
    if (existing) {
      throw new ConflictException(
        `이미 ${input.tool} 도구의 라이선스가 등록되어 있습니다. 기존 라이선스를 먼저 취소해주세요.`,
      );
    }

    const license = await this.prisma.license.create({
      data: {
        tool: input.tool,
        keyHash: this.hashKey(input.licenseKey),
        familyId: input.familyId,
        status: LicenseStatus.ACTIVE,
        expiresAt: input.expiresAt ?? null,
        notes: input.notes ?? null,
      },
    });

    await this.toolDataService
      .createForFamily(input.familyId, input.tool, input.registeredBy ?? 'system')
      .catch((err) => this.logger.error(`Failed to create questionnaire for ${input.tool}`, err));

    return license;
  }

  async activate(id: string) {
    const license = await this.prisma.license.findUnique({ where: { id } });
    if (!license) throw new NotFoundException('라이선스를 찾을 수 없습니다');
    return this.prisma.license.update({
      where: { id },
      data: { status: LicenseStatus.ACTIVE },
    });
  }

  async revoke(id: string) {
    const license = await this.prisma.license.findUnique({ where: { id } });
    if (!license) throw new NotFoundException('라이선스를 찾을 수 없습니다');
    return this.prisma.license.update({
      where: { id },
      data: { status: LicenseStatus.REVOKED },
    });
  }

  async remove(id: string) {
    const license = await this.prisma.license.findUnique({ where: { id } });
    if (!license) throw new NotFoundException('라이선스를 찾을 수 없습니다');
    await this.prisma.license.delete({ where: { id } });
  }

  async listAll(page = 1, limit = 20) {
    await this.expireStale();
    const [items, total] = await Promise.all([
      this.prisma.license.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { family: { select: { id: true, name: true } } },
      }),
      this.prisma.license.count(),
    ]);
    return { items, total, page, limit };
  }

  async getFamilyLicenses(familyId: string) {
    await this.expireStale();
    return this.prisma.license.findMany({
      where: { familyId },
      orderBy: { tool: 'asc' },
    });
  }

  async validateLicense(familyId: string, tool: LicensedTool): Promise<boolean> {
    await this.expireStale();
    const license = await this.prisma.license.findUnique({
      where: { tool_familyId: { tool, familyId } },
    });
    return license?.status === LicenseStatus.ACTIVE;
  }

  private async expireStale(): Promise<void> {
    const count = await this.prisma.license.updateMany({
      where: {
        status: LicenseStatus.ACTIVE,
        expiresAt: { lt: new Date() },
      },
      data: { status: LicenseStatus.EXPIRED },
    });
    if (count.count > 0) {
      this.logger.log(`Expired ${count.count} licenses`);
    }
  }
}
