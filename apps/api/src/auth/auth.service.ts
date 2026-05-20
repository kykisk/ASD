import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@auticare/prisma-client';
import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import type { RegisterOutput, LoginOutput, AuthResponse, AuthUser } from '@auticare/dto';
import { ApiException } from '../common/exceptions/api.exception.js';
import { RedisTokenService } from './redis-token.service.js';

type OAuthProvider = 'GOOGLE' | 'KAKAO' | 'APPLE';

interface OAuthUserData {
  provider: OAuthProvider;
  providerUserId: string;
  email: string;
  name: string;
  accessToken?: string;
  refreshToken?: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface AuthResult extends AuthResponse {
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly BCRYPT_ROUNDS = 12;
  private readonly REFRESH_TOKEN_TTL_DAYS = 7;
  private readonly MAX_REFRESH_TOKENS = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly redisTokenService: RedisTokenService,
  ) {}

  async register(dto: RegisterOutput): Promise<AuthResult> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ApiException(409, 'AUTH_007', '이미 등록된 이메일입니다');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
      },
    });

    const tokens = await this.generateTokens(user);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.mapUserToAuthUser(user),
    };
  }

  async login(dto: LoginOutput): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.passwordHash) {
      throw new ApiException(401, 'AUTH_001', '이메일 또는 비밀번호가 올바르지 않습니다');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new ApiException(401, 'AUTH_001', '이메일 또는 비밀번호가 올바르지 않습니다');
    }

    if (!user.isActive) {
      throw new ApiException(403, 'AUTH_006', '비활성화된 계정입니다');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens(user);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.mapUserToAuthUser(user),
    };
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; user: AuthUser }> {
    const tokenHash = this.hashRefreshToken(refreshToken);

    const storedToken = await this.prisma.refreshToken.findFirst({
      where: { tokenHash },
      include: { user: true },
    });

    if (!storedToken) {
      throw new ApiException(401, 'AUTH_005', '유효하지 않은 리프레시 토큰입니다');
    }

    if (storedToken.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: storedToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new ApiException(401, 'AUTH_005', '토큰 재사용이 감지되었습니다. 모든 세션이 종료됩니다');
    }

    if (storedToken.expiresAt < new Date()) {
      await this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() },
      });
      throw new ApiException(401, 'AUTH_004', '리프레시 토큰이 만료되었습니다');
    }

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.generateTokens(storedToken.user);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.mapUserToAuthUser(storedToken.user),
    };
  }

  async logout(refreshToken: string | undefined, accessToken: string | undefined): Promise<void> {
    if (refreshToken) {
      const tokenHash = this.hashRefreshToken(refreshToken);
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    if (accessToken) {
      await this.blacklistAccessToken(accessToken);
    }
  }

  async validateOAuthUser(
    oauthData: OAuthUserData,
  ): Promise<{ accessToken: string; refreshToken: string; user: AuthUser }> {
    const existingOAuth = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider: oauthData.provider,
          providerUserId: oauthData.providerUserId,
        },
      },
      include: { user: true },
    });

    let user: { id: string; email: string; name: string; role: string; isActive: boolean };

    if (existingOAuth) {
      user = existingOAuth.user;
    } else {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: oauthData.email },
      });

      if (existingUser) {
        user = existingUser;
      } else {
        user = await this.prisma.user.create({
          data: {
            email: oauthData.email,
            name: oauthData.name,
          },
        });
      }

      await this.prisma.oAuthAccount.create({
        data: {
          userId: user.id,
          provider: oauthData.provider,
          providerUserId: oauthData.providerUserId,
          accessToken: oauthData.accessToken,
          refreshToken: oauthData.refreshToken,
        },
      });
    }

    if (!user.isActive) {
      throw new ApiException(403, 'AUTH_006', '비활성화된 계정입니다');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens(user);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.mapUserToAuthUser(user),
    };
  }

  async logoutAll(userId: string, accessToken: string | undefined): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    if (accessToken) {
      await this.blacklistAccessToken(accessToken);
    }
  }

  private async blacklistAccessToken(accessToken: string): Promise<void> {
    try {
      const decoded = this.jwtService.decode(accessToken) as { exp?: number } | null;
      if (decoded?.exp) {
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          const tokenHash = createHash('sha256').update(accessToken).digest('hex');
          await this.redisTokenService.blacklistToken(tokenHash, ttl);
        }
      }
    } catch {
      // intentionally ignored: undecodable tokens don't need blacklisting
    }
  }

  private async generateTokens(user: { id: string; role: string }): Promise<TokenPair> {
    await this.enforceMaxTokens(user.id);

    const familyMember = await this.prisma.familyMember.findFirst({
      where: { userId: user.id },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
      select: { familyId: true },
    });

    const payload = {
      sub: user.id,
      role: user.role,
      familyId: familyMember?.familyId ?? null,
      iss: 'auticare',
    };

    const accessToken = await this.jwtService.signAsync(payload);

    const refreshToken = randomBytes(64).toString('hex');
    const tokenHash = this.hashRefreshToken(refreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.REFRESH_TOKEN_TTL_DAYS);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  private async enforceMaxTokens(userId: string): Promise<void> {
    const tokens = await this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    if (tokens.length >= this.MAX_REFRESH_TOKENS) {
      await this.prisma.refreshToken.update({
        where: { id: tokens[0].id },
        data: { revokedAt: new Date() },
      });
    }
  }

  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private mapUserToAuthUser(user: {
    id: string;
    email: string;
    name: string;
    role: string;
  }): AuthUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as AuthUser['role'],
      familyId: null,
    };
  }
}
