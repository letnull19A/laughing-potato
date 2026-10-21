import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  // Application context (no HTTP driver): bot runs via polling, HTTP
  // controllers stay inactive. PORT is reserved for a future health endpoint.
  const app = await NestFactory.createApplicationContext(AppModule);
  await app.init();
  Logger.log('Application initialized', 'Bootstrap');
}

void bootstrap();
