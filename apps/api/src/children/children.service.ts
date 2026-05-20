import { Injectable } from '@nestjs/common';
import { PrismaService } from '@auticare/prisma-client';
import { EncryptionService } from '@auticare/encryption';
import { ApiException } from '../common/exceptions/api.exception.js';
import type { CreateChildInput, UpdateChildInput } from '@auticare/dto';

export interface DecryptedChild {
  id: string;
  familyId: string;
  name: string;
  birthDate: string;
  gender: string | null;
  diagnosisName: string | null;
  diagnosisDate: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ChildrenService {
  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
  ) {}

  async create(familyId: string, userId: string, dto: CreateChildInput): Promise<DecryptedChild> {
    await this.verifyFamilyMember(familyId, userId);

    const encrypted = await this.encryptionService.encryptPii({
      name: dto.name,
      birthDate: dto.birthDate,
    });

    const child = await this.prisma.child.create({
      data: {
        familyId,
        nameEnc: encrypted.ciphertext,
        encIv: encrypted.iv,
        encAuthTag: encrypted.authTag,
        encSalt: encrypted.salt,
        gender: dto.gender ?? null,
        diagnosisName: dto.diagnosisName ?? null,
        diagnosisDate: dto.diagnosisDate ? new Date(dto.diagnosisDate) : null,
        notes: dto.notes ?? null,
      },
    });

    return this.decryptChild(child);
  }

  async findByFamily(familyId: string, userId: string): Promise<DecryptedChild[]> {
    await this.verifyFamilyMember(familyId, userId);

    const children = await this.prisma.child.findMany({
      where: { familyId },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(children.map((child) => this.decryptChild(child)));
  }

  async findOne(childId: string, userId: string): Promise<DecryptedChild> {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
    });

    if (!child) {
      throw new ApiException(404, 'CHILD_404', '아이를 찾을 수 없습니다');
    }

    await this.verifyFamilyMember(child.familyId, userId);

    return this.decryptChild(child);
  }

  async update(childId: string, userId: string, dto: UpdateChildInput): Promise<DecryptedChild> {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
    });

    if (!child) {
      throw new ApiException(404, 'CHILD_404', '아이를 찾을 수 없습니다');
    }

    await this.verifyFamilyMember(child.familyId, userId);

    const data: Record<string, unknown> = {};

    if (dto.name !== undefined || dto.birthDate !== undefined) {
      const currentPii = await this.encryptionService.decryptPii({
        ciphertext: child.nameEnc,
        iv: child.encIv,
        authTag: child.encAuthTag,
        salt: child.encSalt,
      });

      const encrypted = await this.encryptionService.encryptPii({
        name: dto.name ?? currentPii.name,
        birthDate: dto.birthDate ?? currentPii.birthDate,
      });

      data.nameEnc = encrypted.ciphertext;
      data.encIv = encrypted.iv;
      data.encAuthTag = encrypted.authTag;
      data.encSalt = encrypted.salt;
    }

    if (dto.gender !== undefined) data.gender = dto.gender;
    if (dto.diagnosisName !== undefined) data.diagnosisName = dto.diagnosisName;
    if (dto.diagnosisDate !== undefined) data.diagnosisDate = new Date(dto.diagnosisDate);
    if (dto.notes !== undefined) data.notes = dto.notes;

    const updated = await this.prisma.child.update({
      where: { id: childId },
      data,
    });

    return this.decryptChild(updated);
  }

  async remove(childId: string, userId: string): Promise<{ deleted: true }> {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
    });

    if (!child) {
      throw new ApiException(404, 'CHILD_404', '아이를 찾을 수 없습니다');
    }

    await this.verifyFamilyAdmin(child.familyId, userId);

    await this.prisma.child.delete({ where: { id: childId } });
    return { deleted: true };
  }

  private async decryptChild(child: {
    id: string;
    familyId: string;
    nameEnc: string;
    encIv: string;
    encAuthTag: string;
    encSalt: string;
    gender: string | null;
    diagnosisName: string | null;
    diagnosisDate: Date | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): Promise<DecryptedChild> {
    const pii = await this.encryptionService.decryptPii({
      ciphertext: child.nameEnc,
      iv: child.encIv,
      authTag: child.encAuthTag,
      salt: child.encSalt,
    });

    return {
      id: child.id,
      familyId: child.familyId,
      name: pii.name,
      birthDate: pii.birthDate,
      gender: child.gender,
      diagnosisName: child.diagnosisName,
      diagnosisDate: child.diagnosisDate,
      notes: child.notes,
      createdAt: child.createdAt,
      updatedAt: child.updatedAt,
    };
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

  private async verifyFamilyAdmin(familyId: string, userId: string) {
    const membership = await this.verifyFamilyMember(familyId, userId);

    if (membership.role !== 'FAMILY_ADMIN') {
      throw new ApiException(403, 'FORBIDDEN', '관리자 권한이 필요합니다');
    }

    return membership;
  }
}
