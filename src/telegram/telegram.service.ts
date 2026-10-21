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

    this.bot.catch((err) =>
      this.logger.warn(
        `Telegraf error: ${err instanceof Error ? err.message : String(err)}`,
      ),
    );

    this.bot.on('message', async (ctx) => {
      const message = ctx.message as { text?: unknown };
      if (typeof message.text !== 'string') {
        return;
      }
      if (!message.text.includes(tag)) {
        return;
      }
      this.logger.debug('Telegram mention received');
      try {
        await ctx.reply(`ack: ${message.text}`);
      } catch (error) {
        this.logger.warn(
          `Failed to reply: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await this.bot.launch();
        break;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (attempt === 3) {
          this.logger.error(`Telegram launch failed after 3 attempts: ${message}`);
          throw error;
        }
        this.logger.warn(`Telegram launch attempt ${attempt} failed: ${message}, retrying...`);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
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
