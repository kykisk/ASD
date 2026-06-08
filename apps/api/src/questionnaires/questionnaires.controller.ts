import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { QuestionnairesService } from './questionnaires.service.js';
import { QuestionnaireImportService } from './questionnaire-import.service.js';
import { QuestionnaireFilterService } from './questionnaire-filter.service.js';
import { QuestionnaireGenerateService } from './questionnaire-generate.service.js';
import { ImageImportService } from './image-import.service.js';
import { PrismaService } from '@auticare/prisma-client';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import {
  CreateQuestionnaireDto,
  UpdateQuestionnaireDto,
  AddItemDto,
  ReorderItemsDto,
} from '@auticare/dto';

@Controller()
export class QuestionnairesController {
  constructor(
    private questionnairesService: QuestionnairesService,
    private importService: QuestionnaireImportService,
    private filterService: QuestionnaireFilterService,
    private generateService: QuestionnaireGenerateService,
    private imageImportService: ImageImportService,
    private prisma: PrismaService,
  ) {}

  @Post('families/:familyId/questionnaires')
  async create(
    @CurrentUser() user: { id: string },
    @Param('familyId') familyId: string,
    @Body() dto: CreateQuestionnaireDto,
  ) {
    return this.questionnairesService.create(familyId, user.id, dto);
  }

  @Post('families/:familyId/questionnaires/import/csv')
  @UseInterceptors(FileInterceptor('file'))
  async importCSV(
    @CurrentUser() user: { id: string },
    @Param('familyId') familyId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('name') name: string,
  ) {
    return this.importService.importFromCSV(familyId, user.id, name, file.buffer);
  }

  @Post('families/:familyId/questionnaires/import/excel')
  @UseInterceptors(FileInterceptor('file'))
  async importExcel(
    @CurrentUser() user: { id: string },
    @Param('familyId') familyId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('name') name: string,
  ) {
    return this.importService.importFromExcel(familyId, user.id, name, file.buffer);
  }

  @Get('families/:familyId/questionnaires')
  async findAll(@CurrentUser() user: { id: string }, @Param('familyId') familyId: string) {
    return this.questionnairesService.findAll(familyId, user.id);
  }

  @Get('questionnaires/:id')
  async findOne(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.questionnairesService.findOne(id, user.id);
  }

  @Patch('questionnaires/:id')
  async update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateQuestionnaireDto,
  ) {
    return this.questionnairesService.update(id, user.id, dto);
  }

  @Delete('questionnaires/:id')
  async remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.questionnairesService.remove(id, user.id);
  }

  @Post('questionnaires/:id/items')
  async addItem(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: AddItemDto,
  ) {
    return this.questionnairesService.addItem(id, user.id, dto);
  }

  @Delete('questionnaires/:id/items/:itemId')
  async removeItem(@CurrentUser() user: { id: string }, @Param('itemId') itemId: string) {
    return this.questionnairesService.removeItem(itemId, user.id);
  }

  @Patch('questionnaires/:id/items/reorder')
  async reorderItems(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: ReorderItemsDto,
  ) {
    return this.questionnairesService.reorderItems(id, user.id, dto);
  }

  @Post('questionnaires/ai-filter')
  async aiFilter(@Body() body: { items: Array<{ text: string; domain: string }> }) {
    return this.filterService.filterItems(body.items);
  }

  @Post('questionnaires/ai-generate')
  async aiGenerate(
    @CurrentUser() user: { id: string; familyId?: string },
    @Body()
    body: {
      familyId: string;
      childId?: string;
      childAgeMonths: number;
      targetDomains: string[];
      additionalContext?: string;
    },
  ) {
    let developmentalLevel: Record<string, string> | undefined;
    let centerInfo:
      | Array<{ name: string; type: string; frequency: string; currentGoal?: string }>
      | undefined;

    if (body.childId) {
      const child = await this.prisma.child.findUnique({ where: { id: body.childId } });
      if (child) {
        developmentalLevel = (child.developmentalLevel as any) ?? undefined;
        centerInfo = (child.centerInfo as any) ?? undefined;
      }
    }

    const generated = await this.generateService.generateQuestionnaire({
      familyId: body.familyId,
      userId: user.id,
      childAgeMonths: body.childAgeMonths,
      targetDomains: body.targetDomains,
      additionalContext: body.additionalContext,
      developmentalLevel,
      centerInfo,
    });

    const questionnaire = await this.generateService.createFromGenerated(
      body.familyId,
      user.id,
      generated,
    );

    return { generated, questionnaire };
  }

  @Post('families/:familyId/questionnaires/from-image')
  async importFromImage(
    @Param('familyId') familyId: string,
    @CurrentUser() user: { id: string },
    @Body() body: { images: Array<{ base64: string; mimeType: string }> },
  ) {
    if (!body.images || body.images.length === 0) {
      throw new (await import('../common/exceptions/api.exception.js')).ApiException(
        400,
        'QUESTIONNAIRE_IMAGE_001',
        '이미지를 1장 이상 업로드해주세요',
      );
    }

    const extraction =
      body.images.length === 1
        ? await this.imageImportService.extractFromImage(
            body.images[0].base64,
            body.images[0].mimeType,
          )
        : await this.imageImportService.extractFromMultipleImages(body.images);

    return { extraction, familyId, userId: user.id };
  }
}
