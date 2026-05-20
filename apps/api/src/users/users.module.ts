import { Module } from '@nestjs/common';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { GdprService } from './gdpr.service.js';

@Module({
  controllers: [UsersController],
  providers: [UsersService, GdprService],
  exports: [UsersService],
})
export class UsersModule {}
