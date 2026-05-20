import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { FamiliesService } from './families.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import {
  CreateFamilyDto,
  UpdateFamilyDto,
  InviteMemberDto,
  UpdateMemberDto,
} from '@auticare/dto';

@Controller('families')
export class FamiliesController {
  constructor(private familiesService: FamiliesService) {}

  @Post()
  async create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateFamilyDto,
  ) {
    return this.familiesService.create(user.id, dto);
  }

  @Get('my')
  async findMyFamilies(@CurrentUser() user: { id: string }) {
    return this.familiesService.findMyFamilies(user.id);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.familiesService.findOne(id, user.id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateFamilyDto,
  ) {
    return this.familiesService.update(id, user.id, dto);
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.familiesService.remove(id, user.id);
  }

  @Post(':id/members')
  async inviteMember(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.familiesService.inviteMember(id, user.id, dto);
  }

  @Patch(':id/members/:memberId')
  async updateMember(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.familiesService.updateMember(id, user.id, memberId, dto);
  }

  @Delete(':id/members/:memberId')
  async removeMember(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    return this.familiesService.removeMember(id, user.id, memberId);
  }
}
