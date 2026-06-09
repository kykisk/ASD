import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { Logger } from '@nestjs/common';
import { AppModule } from './app/app.module.js';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('v1');

  const httpAdapter = app.getHttpAdapter();
  httpAdapter.getInstance().set('etag', false);

  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          scriptSrc: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(cookieParser());

  app.enableCors({
    origin: process.env['CORS_ORIGINS']?.split(',') ?? [],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-ID',
      'X-Client-Type',
      'X-Device-Id',
    ],
    exposedHeaders: ['X-Request-ID'],
    maxAge: 86400,
  });

  const port = process.env['PORT'] || 3100;
  await app.listen(port);
  Logger.log(`Application is running on: http://localhost:${port}/v1`);
}

bootstrap();
