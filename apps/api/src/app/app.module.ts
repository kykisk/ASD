import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ZodValidationPipe } from 'nestjs-zod';
import { PrismaModule } from '@auticare/prisma-client';
import { EncryptionModule } from '@auticare/encryption';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ApiExceptionFilter } from '../common/filters/api-exception.filter.js';
import { ResponseTransformInterceptor } from '../common/interceptors/response-transform.interceptor.js';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor.js';
import { SanitizeInterceptor } from '../common/interceptors/sanitize.interceptor.js';
import { AuthModule } from '../auth/auth.module.js';
import { UsersModule } from '../users/users.module.js';
import { FamiliesModule } from '../families/families.module.js';
import { ChildrenModule } from '../children/children.module.js';
import { SchedulesModule } from '../schedules/schedules.module.js';
import { QuestionnairesModule } from '../questionnaires/questionnaires.module.js';
import { ConsentModule } from '../consent/consent.module.js';
import { AssessmentsModule } from '../assessments/assessments.module.js';
import { UploadsModule } from '../uploads/uploads.module.js';
import { DashboardModule } from '../dashboard/dashboard.module.js';
import { AiConfigModule } from '../ai-config/ai-config.module.js';
import { CacheModule } from '../common/cache/cache.module.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    ThrottlerModule.forRoot(
      process.env['NODE_ENV'] === 'production'
        ? [
            { name: 'global', ttl: 60000, limit: 100 },
            { name: 'auth', ttl: 60000, limit: 5 },
          ]
        : [],
    ),
    PrismaModule,
    EncryptionModule,
    CacheModule,
    AuthModule,
    UsersModule,
    FamiliesModule,
    ChildrenModule,
    SchedulesModule,
    QuestionnairesModule,
    ConsentModule,
    AssessmentsModule,
    UploadsModule,
    DashboardModule,
    AiConfigModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    {
      provide: APP_FILTER,
      useClass: ApiExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseTransformInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SanitizeInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
