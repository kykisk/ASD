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
    return this.importService.importFromCSV(
      familyId,
      user.id,
      name,
      file.buffer,
    );
  }

  @Post('families/:familyId/questionnaires/import/excel')
  @UseInterceptors(FileInterceptor('file'))
  async importExcel(
    @CurrentUser() user: { id: string },
    @Param('familyId') familyId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('name') name: string,
  ) {
    return this.importService.importFromExcel(
      familyId,
      user.id,
      name,
      file.buffer,
    );
  }

  @Get('families/:familyId/questionnaires')
  async findAll(
    @CurrentUser() user: { id: string },
    @Param('familyId') familyId: string,
  ) {
    return this.questionnairesService.findAll(familyId, user.id);
  }

  @Get('questionnaires/:id')
  async findOne(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
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
  async remove(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
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
  async removeItem(
    @CurrentUser() user: { id: string },
    @Param('itemId') itemId: string,
  ) {
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
}
