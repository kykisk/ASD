import { Controller, Get, Post, Body, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ConsentService } from './consent.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { RecordConsentDto } from '@auticare/dto';

@Controller('consent')
export class ConsentController {
  constructor(private consentService: ConsentService) {}

  @Post()
  async recordConsent(
    @CurrentUser() user: { id: string },
    @Body() dto: RecordConsentDto,
    @Req() req: Request,
  ) {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    return this.consentService.record(user.id, dto, ipAddress, userAgent);
  }

  @Get()
  async getUserConsents(@CurrentUser() user: { id: string }) {
    return this.consentService.getUserConsents(user.id);
  }

  @Get('check')
  async checkConsent(
    @CurrentUser() user: { id: string },
    @Query('type') consentType: string,
    @Query('version') version: string,
  ) {
    const consented = await this.consentService.hasConsented(
      user.id,
      consentType,
      version,
    );
    return { consented };
  }

  @Get('versions')
  getCurrentVersions() {
    return this.consentService.getCurrentVersions();
  }
}
