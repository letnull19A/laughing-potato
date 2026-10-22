import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Telegraf } from 'telegraf';
import { ConfigService } from '../config/config.service.js';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private bot?: Telegraf;
  private retryTimer?: NodeJS.Timeout;
  private retryScheduled = false;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const token = this.config.get('BOT_TOKEN');
    const tag = this.config.get('BOT_TAG');
    const mode = this.config.get('TELEGRAM_MODE');

    if (!token) {
      this.logger.log('Telegram disabled (no BOT_TOKEN)');
      return;
    }

    if (mode === 'webhook') {
      const domain = this.config.get('WEBHOOK_DOMAIN');
      const port = Number(this.config.get('PORT'));
      const hookPath = this.config.get('WEBHOOK_PATH');
      if (!domain) {
        this.logger.error(
          'Telegram webhook unavailable, running degraded: WEBHOOK_DOMAIN is required when TELEGRAM_MODE=webhook (public https URL, e.g. https://bot.example.com)',
        );
        return;
      }
      await this.startWithRetry(async () => {
        const bot = this.createBot(token, tag);
        await bot.launch({
          webhook: { domain, port, hookPath },
        });
        return bot;
      }, 'webhook');
      return;
    }

    await this.startWithRetry(async () => {
      const bot = this.createBot(token, tag);
      await bot.launch();
      return bot;
    }, 'polling');
  }

  private async startWithRetry(
    launchFn: () => Promise<Telegraf>,
    label: string,
  ): Promise<void> {
    let lastMessage = '';
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const bot = await launchFn();
        this.bot = bot;
        this.logger.log(`Telegram ${label} started`);
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        lastMessage = message;
        if (attempt < 3) {
          this.logger.warn(
            `Telegram ${label} launch attempt ${attempt} failed: ${message}, retrying...`,
          );
          await new Promise((r) => setTimeout(r, 3000));
        }
      }
    }

    this.bot = undefined;
    this.logger.error(
      `Telegram ${label} unavailable, running degraded: ${lastMessage}`,
    );
    this.scheduleRetry(launchFn, label);
  }

  private createBot(token: string, tag: string): Telegraf {
    const bot = new Telegraf(token);

    bot.catch((err) =>
      this.logger.warn(
        `Telegraf error: ${err instanceof Error ? err.message : String(err)}`,
      ),
    );

    bot.on('message', async (ctx) => {
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

    return bot;
  }

  private scheduleRetry(
    launchFn: () => Promise<Telegraf>,
    label: string,
  ): void {
    if (this.retryScheduled) {
      return;
    }
    this.retryScheduled = true;
    this.retryTimer = setTimeout(async () => {
      this.retryTimer = undefined;
      this.retryScheduled = false;
      try {
        const bot = await launchFn();
        this.bot = bot;
        this.logger.log(`Telegram ${label} started`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Telegram ${label} retry failed: ${message}, will retry...`,
        );
        this.scheduleRetry(launchFn, label);
      }
    }, 30000);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = undefined;
      this.retryScheduled = false;
    }
    if (this.bot) {
      const mode = this.config.get('TELEGRAM_MODE');
      this.bot.stop('SIGTERM');
      this.bot = undefined;
      this.logger.log(`Telegram ${mode} stopped`);
    }
  }
}
