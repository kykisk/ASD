import { Module } from '@nestjs/common';
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

const oauthProviders = [
  {
    envKey: 'GOOGLE_CLIENT_ID',
    strategy: GoogleStrategy,
  },
  {
    envKey: 'KAKAO_CLIENT_ID',
    strategy: KakaoStrategy,
  },
  {
    envKey: 'APPLE_CLIENT_ID',
    strategy: AppleStrategy,
  },
];

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>("JWT_ACCESS_SECRET"),
        signOptions: {
          expiresIn: '15m',
          issuer: 'auticare',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    RedisTokenService,
    ...oauthProviders
      .filter(({ envKey }) => !!process.env[envKey])
      .map(({ strategy }) => strategy),
  ],
  exports: [AuthService, RedisTokenService],
})
export class AuthModule {}
