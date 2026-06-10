import { Module, Logger } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { GoogleStrategy } from './strategies/google.strategy.js';
import { KakaoStrategy } from './strategies/kakao.strategy.js';
import { AppleStrategy } from './strategies/apple.strategy.js';
import { RedisTokenService } from './redis-token.service.js';

const logger = new Logger('AuthModule');

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: '15m', issuer: 'auticare' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    RedisTokenService,
    {
      provide: GoogleStrategy,
      useFactory: (config: ConfigService, auth: AuthService) => {
        if (!config.get('GOOGLE_CLIENT_ID')) {
          logger.warn('GOOGLE_CLIENT_ID not set — Google OAuth disabled');
          return null;
        }
        return new GoogleStrategy(config, auth);
      },
      inject: [ConfigService, AuthService],
    },
    {
      provide: KakaoStrategy,
      useFactory: (config: ConfigService, auth: AuthService) => {
        if (!config.get('KAKAO_CLIENT_ID')) {
          logger.warn('KAKAO_CLIENT_ID not set — Kakao OAuth disabled');
          return null;
        }
        if (!config.get('KAKAO_CALLBACK_URL')) {
          logger.warn('KAKAO_CALLBACK_URL not set — Kakao OAuth disabled');
          return null;
        }
        return new KakaoStrategy(config, auth);
      },
      inject: [ConfigService, AuthService],
    },
    {
      provide: AppleStrategy,
      useFactory: (config: ConfigService, auth: AuthService) => {
        if (!config.get('APPLE_CLIENT_ID')) {
          logger.warn('APPLE_CLIENT_ID not set — Apple OAuth disabled');
          return null;
        }
        return new AppleStrategy(config, auth);
      },
      inject: [ConfigService, AuthService],
    },
  ],
  exports: [AuthService, RedisTokenService],
})
export class AuthModule {}
