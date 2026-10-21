import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Telegraf } from 'telegraf';
import { ConfigService } from '../config/config.service.js';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private bot?: Telegraf;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const token = this.config.get('BOT_TOKEN');
    const tag = this.config.get('BOT_TAG');

    if (!token) {
      this.logger.log('Telegram disabled (no BOT_TOKEN)');
      return;
    }

    this.bot = new Telegraf(token);

    this.bot.on('message', async (ctx) => {
      const message = ctx.message as { text?: unknown };
      if (typeof message.text !== 'string') {
        return;
      }
      if (!message.text.includes(tag)) {
        return;
      }
      await ctx.reply(`ack: ${message.text}`);
    });

    await this.bot.launch();
    this.logger.log('Telegram polling started');
  }

  async onModuleDestroy(): Promise<void> {
    if (this.bot) {
      this.bot.stop('SIGTERM');
      this.bot = undefined;
      this.logger.log('Telegram polling stopped');
    }
  }
}
