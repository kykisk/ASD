import { Injectable } from '@nestjs/common';
import { PrismaService } from '@auticare/prisma-client';
import { EncryptionService } from '@auticare/encryption';

export interface UserDataExport {
  exportedAt: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    createdAt: string;
  };
  families: Array<{
    id: string;
    name: string;
    role: string;
    children: Array<{
      id: string;
      name: string;
      birthDate: string;
      gender: string | null;
      diagnosisName: string | null;
    }>;
  }>;
  assessments: Array<{
    id: string;
    childName: string;
    createdAt: string;
    totalScore: number | null;
    scores: Array<{ domain: string; score: number }>;
  }>;
  schedules: Array<{
    title: string;
    startTime: string;
    category: string;
  }>;
  consents: Array<{
    consentType: string;
    consentVersion: string;
    consentedAt: string;
  }>;
}

@Injectable()
export class GdprService {
  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
  ) {}

  async exportUserData(userId: string): Promise<UserDataExport> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    const familyMembers = await this.prisma.familyMember.findMany({
      where: { userId },
      include: {
        family: {
          include: {
            children: true,
            schedules: {
              select: {
                title: true,
                startTime: true,
                category: true,
              },
            },
          },
        },
      },
    });

    const families: UserDataExport['families'] = [];
    const allSchedules: UserDataExport['schedules'] = [];
    const allAssessments: UserDataExport['assessments'] = [];

    for (const membership of familyMembers) {
      const family = membership.family;
      const decryptedChildren: UserDataExport['families'][number]['children'] = [];

      for (const child of family.children) {
        const pii = await this.encryptionService.decryptPii({
          ciphertext: child.nameEnc,
          iv: child.encIv,
          authTag: child.encAuthTag,
          salt: child.encSalt,
        });

        decryptedChildren.push({
          id: child.id,
          name: pii.name,
          birthDate: pii.birthDate,
          gender: child.gender,
          diagnosisName: child.diagnosisName,
        });

        const assessments = await this.prisma.assessment.findMany({
          where: { childId: child.id, familyId: family.id },
          include: {
            scores: {
              select: { domain: true, score: true },
            },
          },
        });

        for (const assessment of assessments) {
          allAssessments.push({
            id: assessment.id,
            childName: pii.name,
            createdAt: assessment.createdAt.toISOString(),
            totalScore: assessment.totalScore,
            scores: assessment.scores.map((s) => ({
              domain: s.domain,
              score: s.score,
            })),
          });
        }
      }

      for (const schedule of family.schedules) {
        allSchedules.push({
          title: schedule.title,
          startTime: schedule.startTime.toISOString(),
          category: schedule.category,
        });
      }

      families.push({
        id: family.id,
        name: family.name,
        role: membership.role,
        children: decryptedChildren,
      });
    }

    const consents = await this.prisma.legalConsent.findMany({
      where: { userId },
      select: {
        consentType: true,
        consentVersion: true,
        consentedAt: true,
      },
    });

    return {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
      },
      families,
      assessments: allAssessments,
      schedules: allSchedules,
      consents: consents.map((c) => ({
        consentType: c.consentType,
        consentVersion: c.consentVersion,
        consentedAt: c.consentedAt.toISOString(),
      })),
    };
  }
}
