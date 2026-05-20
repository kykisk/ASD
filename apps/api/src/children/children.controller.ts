import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ChildrenService } from './children.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { CreateChildDto, UpdateChildDto } from '@auticare/dto';

@Controller()
export class ChildrenController {
  constructor(private childrenService: ChildrenService) {}

  @Post('families/:familyId/children')
  async create(
    @CurrentUser() user: { id: string },
    @Param('familyId') familyId: string,
    @Body() dto: CreateChildDto,
  ) {
    return this.childrenService.create(familyId, user.id, dto);
  }

  @Get('families/:familyId/children')
  async findByFamily(
    @CurrentUser() user: { id: string },
    @Param('familyId') familyId: string,
  ) {
    return this.childrenService.findByFamily(familyId, user.id);
  }

  @Get('children/:id')
  async findOne(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.childrenService.findOne(id, user.id);
  }

  @Patch('children/:id')
  async update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateChildDto,
  ) {
    return this.childrenService.update(id, user.id, dto);
  }

  @Delete('children/:id')
  async remove(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.childrenService.remove(id, user.id);
  }
}
