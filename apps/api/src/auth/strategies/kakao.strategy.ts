import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, InternalOAuthError } from 'passport-oauth2';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service.js';

interface KakaoProfile {
  id: number;
  kakao_account?: {
    email?: string;
    profile?: {
      nickname?: string;
    };
  };
}

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      authorizationURL: 'https://kauth.kakao.com/oauth/authorize',
      tokenURL: 'https://kauth.kakao.com/oauth/token',
      clientID: configService.get<string>('KAKAO_CLIENT_ID'),
      clientSecret: configService.get<string>('KAKAO_CLIENT_SECRET'),
      callbackURL: configService.get<string>('KAKAO_CALLBACK_URL'),
      scope: ['account_email', 'profile_nickname'],
    });
  }

  async userProfile(
    accessToken: string,
    done: (err: Error | null, profile?: KakaoProfile) => void,
  ): Promise<void> {
    try {
      const response = await fetch('https://kapi.kakao.com/v2/user/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        done(new InternalOAuthError('Failed to fetch Kakao user profile', new Error(`HTTP ${response.status}`)));
        return;
      }

      const profile = (await response.json()) as KakaoProfile;
      done(null, profile);
    } catch (err) {
      done(new InternalOAuthError('Failed to fetch Kakao user profile', err as Error));
    }
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: KakaoProfile,
    done: (err: Error | null, user?: unknown) => void,
  ): Promise<void> {
    const email = profile.kakao_account?.email ?? '';
    const name = profile.kakao_account?.profile?.nickname ?? '';

    const user = await this.authService.validateOAuthUser({
      provider: 'KAKAO',
      providerUserId: String(profile.id),
      email,
      name,
      accessToken,
      refreshToken,
    });
    done(null, user);
  }
}
