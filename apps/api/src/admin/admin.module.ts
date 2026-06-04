import { Module } from '@nestjs/common';
import { PrismaModule } from '@auticare/prisma-client';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { ResearchModule } from '../research/research.module.js';

@Module({
  imports: [PrismaModule, ResearchModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
