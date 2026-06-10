import { Controller, Post, Get, Body, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { RegisterDto, LoginDto } from '@auticare/dto';
import { Public } from '../common/decorators/public.decorator.js';
import { AuthService } from './auth.service.js';
import { ApiException } from '../common/exceptions/api.exception.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Throttle({ auth: { ttl: 60000, limit: 5 } })
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto);
    this.setRefreshCookie(res, req, result.refreshToken);

    const response: { accessToken: string; refreshToken?: string; user: typeof result.user } = {
      accessToken: result.accessToken,
      user: result.user,
    };

    if (this.isMobileClient(req)) {
      response.refreshToken = result.refreshToken;
    }

    return response;
  }

  @Public()
  @Throttle({ auth: { ttl: 60000, limit: 5 } })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    this.setRefreshCookie(res, req, result.refreshToken);

    const response: { accessToken: string; refreshToken?: string; user: typeof result.user } = {
      accessToken: result.accessToken,
      user: result.user,
    };

    if (this.isMobileClient(req)) {
      response.refreshToken = result.refreshToken;
    }

    return response;
  }

  @Public()
  @Throttle({ auth: { ttl: 60000, limit: 5 } })
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const isMobile = this.isMobileClient(req);
    const refreshToken = isMobile
      ? (req.body as { refreshToken?: string })?.refreshToken
      : req.cookies?.['__auticare_rt'];

    if (!refreshToken) {
      throw new ApiException(401, 'AUTH_004', '리프레시 토큰이 필요합니다');
    }

    const result = await this.authService.refresh(refreshToken);
    this.setRefreshCookie(res, req, result.refreshToken);

    if (isMobile) {
      return {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      };
    }
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken =
      req.cookies?.['__auticare_rt'] || (req.body as { refreshToken?: string })?.refreshToken;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    await this.authService.logout(refreshToken, accessToken);
    res.clearCookie('__auticare_rt', { path: '/v1/auth' });
    return null;
  }

  @Post('logout-all')
  async logoutAll(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    const user = (req as Request & { user?: { id: string } }).user;
    if (!user) {
      throw new ApiException(401, 'AUTH_003', '유효하지 않은 토큰입니다');
    }
    await this.authService.logoutAll(user.id, accessToken);
    res.clearCookie('__auticare_rt', { path: '/v1/auth' });
    return null;
  }

  private isMobileClient(req: Request): boolean {
    return req.headers['x-client-type'] === 'mobile';
  }

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin(): void {
    return;
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleCallback(@Req() req: Request, @Res({ passthrough: true }) res: Response): void {
    const oauthUser = req.user as { accessToken: string; refreshToken: string };
    this.setRefreshCookie(res, req, oauthUser.refreshToken);
    const webUrl = this.configService.get<string>('WEB_URL', 'http://localhost:4200');
    res.redirect(`${webUrl}/auth/callback?token=${oauthUser.accessToken}`);
  }

  @Public()
  @Get('kakao')
  @UseGuards(AuthGuard('kakao'))
  kakaoLogin(): void {
    return;
  }

  @Public()
  @Get('kakao/callback')
  @UseGuards(AuthGuard('kakao'))
  kakaoCallback(@Req() req: Request, @Res({ passthrough: true }) res: Response): void {
    const oauthUser = req.user as { accessToken: string; refreshToken: string };
    this.setRefreshCookie(res, req, oauthUser.refreshToken);
    const webUrl = this.configService.get<string>('WEB_URL', 'http://localhost:4200');
    res.redirect(`${webUrl}/auth/callback?token=${oauthUser.accessToken}`);
  }

  @Public()
  @Get('apple')
  @UseGuards(AuthGuard('apple'))
  appleLogin(): void {
    return;
  }

  @Public()
  @Post('apple/callback')
  @UseGuards(AuthGuard('apple'))
  appleCallback(@Req() req: Request, @Res({ passthrough: true }) res: Response): void {
    const oauthUser = req.user as { accessToken: string; refreshToken: string };
    this.setRefreshCookie(res, req, oauthUser.refreshToken);
    const webUrl = this.configService.get<string>('WEB_URL', 'http://localhost:4200');
    res.redirect(`${webUrl}/auth/callback?token=${oauthUser.accessToken}`);
  }

  private setRefreshCookie(res: Response, req: Request, refreshToken: string): void {
    if (!this.isMobileClient(req)) {
      res.cookie('__auticare_rt', refreshToken, {
        httpOnly: true,
        secure: process.env['NODE_ENV'] !== 'development',
        sameSite: 'lax',
        path: '/v1/auth',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    }
  }
}
