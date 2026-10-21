import { Injectable } from '@nestjs/common';
import { envSchema, type Env } from './env.schema.js';

@Injectable()
export class ConfigService {
  readonly env: Env;

  constructor() {
    // Тестабельность без DI-поломки — через прямое чтение process.env.
    // Приоритет: окружение > .env-файл (дефолт dotenv: compose environment > env_file, существующие переменные окружения не перезаписываются).
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
      const fields = parsed.error.issues
        .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
        .join('; ');
      throw new Error(`Config error: ${fields}`);
    }
    this.env = parsed.data;
  }

  get<K extends keyof Env>(key: K): Env[K] {
    return this.env[key];
  }
}
