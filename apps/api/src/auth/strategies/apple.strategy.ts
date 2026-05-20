import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-apple';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service.js';

interface AppleProfile {
  id: string;
  email?: string;
  name?: { firstName?: string; lastName?: string };
}

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('APPLE_CLIENT_ID'),
      teamID: configService.get<string>('APPLE_TEAM_ID'),
      keyID: configService.get<string>('APPLE_KEY_ID'),
      privateKeyLocation: configService.get<string>('APPLE_PRIVATE_KEY_PATH'),
      callbackURL: configService.get<string>('APPLE_CALLBACK_URL'),
      scope: ['name', 'email'],
      passReqToCallback: false,
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    idToken: { sub: string; email?: string },
    profile: AppleProfile,
    done: (err: Error | null, user?: unknown) => void,
  ): Promise<void> {
    const name = profile?.name
      ? [profile.name.firstName, profile.name.lastName].filter(Boolean).join(' ')
      : '';

    const user = await this.authService.validateOAuthUser({
      provider: 'APPLE',
      providerUserId: idToken.sub,
      email: idToken.email ?? '',
      name,
      accessToken,
      refreshToken,
    });
    done(null, user);
  }
}
