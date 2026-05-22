import { Controller, Get, Patch, Param, Body } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '@auticare/prisma-client';
import { AdminService } from './admin.service.js';

@Controller('admin')
@Roles(UserRole.SYSTEM_ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('families')
  async listFamilies() {
    return this.adminService.listFamilies();
  }

  @Patch('families/:id/tier')
  async updateFamilyTier(
    @Param('id') id: string,
    @Body() body: { aiTier: string },
  ) {
    return this.adminService.updateFamilyTier(id, body.aiTier);
  }
}
