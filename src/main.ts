import 'dotenv/config';
import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module.js';

async function bootstrap(): Promise<void> {
  // Application context (no HTTP driver): polling by default, in webhook
  // mode PORT is used by the Telegraf webhook-listener. HTTP controllers stay inactive.
  const app = await NestFactory.createApplicationContext(AppModule);
  app.enableShutdownHooks();
  await app.init();
  Logger.log('Application initialized', 'Bootstrap');
}

void bootstrap();
