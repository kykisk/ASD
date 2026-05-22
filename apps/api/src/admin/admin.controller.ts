import { Controller, Get, Patch, Param, Body, Query } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '@auticare/prisma-client';
import { AdminService } from './admin.service.js';

@Controller('admin')
@Roles(UserRole.SYSTEM_ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  async listUsers(
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listUsers({
      search,
      role,
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Patch('users/:id/role')
  async updateUserRole(
    @Param('id') id: string,
    @Body() body: { role: string },
  ) {
    return this.adminService.updateUserRole(id, body.role);
  }

  @Patch('users/:id/status')
  async toggleUserStatus(
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
  ) {
    return this.adminService.toggleUserStatus(id, body.isActive);
  }

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
