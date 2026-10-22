import { z } from 'zod';

export const envSchema = z.object({
  BOT_TOKEN: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().min(1).optional(),
  ),
  BOT_TAG: z.string().min(1).refine((v) => v.startsWith('@'), { message: 'BOT_TAG must start with @, e.g. @mybot' }).default('@bot'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  // Used by the Telegraf webhook-listener in webhook mode
  // (in polling mode accepted but not used for listening).
  PORT: z.string().min(1).default('3000'),
  TELEGRAM_MODE: z.enum(['polling', 'webhook']).default('polling'),
  WEBHOOK_DOMAIN: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().url().optional(),
  ),
  WEBHOOK_PATH: z
    .string()
    .default('/telegram-webhook')
    .refine((v) => v.startsWith('/'), {
      message: 'WEBHOOK_PATH must start with /',
    }),
}).superRefine((val, ctx) => {
  if (val.TELEGRAM_MODE === 'webhook' && !val.WEBHOOK_DOMAIN) {
    ctx.addIssue({
      code: 'custom',
      path: ['WEBHOOK_DOMAIN'],
      message:
        'WEBHOOK_DOMAIN is required when TELEGRAM_MODE=webhook (public https URL, e.g. https://bot.example.com)',
    });
  }
});

export type Env = z.infer<typeof envSchema>;
