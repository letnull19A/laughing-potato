import { z } from 'zod';

export const envSchema = z.object({
  BOT_TOKEN: z.string().min(1).optional(),
  BOT_TAG: z.string().min(1).default('bot'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
});

export type Env = z.infer<typeof envSchema>;
