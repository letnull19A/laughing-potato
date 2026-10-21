import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module.js';
import { TelegramModule } from './telegram/telegram.module.js';

@Module({
  imports: [ConfigModule, TelegramModule],
})
export class AppModule {}
