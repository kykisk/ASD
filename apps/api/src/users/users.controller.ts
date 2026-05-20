import { Controller, Get, Patch, Body, Res, Header } from '@nestjs/common';
import type { Response } from 'express';
import { UsersService } from './users.service.js';
import { GdprService } from './gdpr.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { UpdateUserDto } from '@auticare/dto';

@Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private gdprService: GdprService,
  ) {}

  @Get('me')
  async getProfile(@CurrentUser() user: { id: string }) {
    return this.usersService.getProfile(user.id);
  }

  @Patch('me')
  async updateProfile(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Get('me/export')
  @Header('Content-Type', 'application/json')
  async exportData(
    @CurrentUser() user: { id: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.gdprService.exportUserData(user.id);
    const date = new Date().toISOString().split('T')[0];
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="auticare-data-export-${date}.json"`,
    );
    return data;
  }
}
