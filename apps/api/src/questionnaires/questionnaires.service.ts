import { Injectable } from '@nestjs/common';
import { PrismaService } from '@auticare/prisma-client';
import { ApiException } from '../common/exceptions/api.exception.js';
import type { CreateQuestionnaireInput, UpdateQuestionnaireInput, AddItemInput, ReorderItemsInput } from '@auticare/dto';

@Injectable()
export class QuestionnairesService {
  constructor(private prisma: PrismaService) {}

  async create(familyId: string, userId: string, dto: CreateQuestionnaireInput) {
    await this.verifyFamilyMember(familyId, userId);

    return this.prisma.$transaction(async (tx) => {
      const questionnaire = await tx.questionnaire.create({
        data: {
          familyId,
          name: dto.name,
          description: dto.description ?? null,
          domains: dto.domains,
          createdBy: userId,
          items: {
            create: dto.items.map((item) => ({
              domain: item.domain,
              text: item.text,
              description: item.description ?? null,
              orderIndex: item.orderIndex,
              weight: item.weight ?? 1.0,
            })),
          },
        },
        include: { items: { orderBy: { orderIndex: 'asc' } } },
      });

      return questionnaire;
    });
  }

  async findAll(familyId: string, userId: string) {
    await this.verifyFamilyMember(familyId, userId);

    return this.prisma.questionnaire.findMany({
      where: { familyId, isActive: true },
      include: { items: { orderBy: { orderIndex: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const questionnaire = await this.prisma.questionnaire.findUnique({
      where: { id },
      include: { items: { orderBy: { orderIndex: 'asc' } } },
    });

    if (!questionnaire || !questionnaire.isActive) {
      throw new ApiException(404, 'QUESTIONNAIRE_404', '설문지를 찾을 수 없습니다');
    }

    await this.verifyFamilyMember(questionnaire.familyId, userId);

    return questionnaire;
  }

  async update(id: string, userId: string, dto: UpdateQuestionnaireInput) {
    const questionnaire = await this.prisma.questionnaire.findUnique({
      where: { id },
    });

    if (!questionnaire || !questionnaire.isActive) {
      throw new ApiException(404, 'QUESTIONNAIRE_404', '설문지를 찾을 수 없습니다');
    }

    await this.verifyFamilyMember(questionnaire.familyId, userId);

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.domains !== undefined) data.domains = dto.domains;

    return this.prisma.questionnaire.update({
      where: { id },
      data,
      include: { items: { orderBy: { orderIndex: 'asc' } } },
    });
  }

  async remove(id: string, userId: string) {
    const questionnaire = await this.prisma.questionnaire.findUnique({
      where: { id },
    });

    if (!questionnaire || !questionnaire.isActive) {
      throw new ApiException(404, 'QUESTIONNAIRE_404', '설문지를 찾을 수 없습니다');
    }

    await this.verifyFamilyMember(questionnaire.familyId, userId);

    await this.prisma.questionnaire.update({
      where: { id },
      data: { isActive: false },
    });

    return { deleted: true };
  }

  async addItem(questionnaireId: string, userId: string, dto: AddItemInput) {
    const questionnaire = await this.prisma.questionnaire.findUnique({
      where: { id: questionnaireId },
    });

    if (!questionnaire || !questionnaire.isActive) {
      throw new ApiException(404, 'QUESTIONNAIRE_404', '설문지를 찾을 수 없습니다');
    }

    await this.verifyFamilyMember(questionnaire.familyId, userId);

    return this.prisma.questionnaireItem.create({
      data: {
        questionnaireId,
        domain: dto.domain,
        text: dto.text,
        description: dto.description ?? null,
        orderIndex: dto.orderIndex,
        weight: dto.weight ?? 1.0,
      },
    });
  }

  async removeItem(itemId: string, userId: string) {
    const item = await this.prisma.questionnaireItem.findUnique({
      where: { id: itemId },
      include: { questionnaire: true },
    });

    if (!item) {
      throw new ApiException(404, 'ITEM_404', '문항을 찾을 수 없습니다');
    }

    await this.verifyFamilyMember(item.questionnaire.familyId, userId);

    await this.prisma.questionnaireItem.delete({ where: { id: itemId } });

    return { deleted: true };
  }

  async reorderItems(questionnaireId: string, userId: string, dto: ReorderItemsInput) {
    const questionnaire = await this.prisma.questionnaire.findUnique({
      where: { id: questionnaireId },
    });

    if (!questionnaire || !questionnaire.isActive) {
      throw new ApiException(404, 'QUESTIONNAIRE_404', '설문지를 찾을 수 없습니다');
    }

    await this.verifyFamilyMember(questionnaire.familyId, userId);

    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.questionnaireItem.update({
          where: { id: item.id },
          data: { orderIndex: item.orderIndex },
        }),
      ),
    );

    return this.prisma.questionnaireItem.findMany({
      where: { questionnaireId },
      orderBy: { orderIndex: 'asc' },
    });
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
