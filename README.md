# laughing-potato
Recive telegram action in telegram chat

# Запуск

## Локальный запуск

- подготовка: `cp .env.example .env`
- старт: `docker compose -f compose.yaml -f compose.dev.yaml up --build` (alt: `bun run dev`)
- стоп: `docker compose -f compose.yaml -f compose.dev.yaml down`
- порт `${PORT:-3000}:3000`, env-имена `BOT_TOKEN` `BOT_TAG` `LOG_LEVEL` `NODE_ENV` `PORT` (без значений)
- stub: пустой `BOT_TOKEN` — Telegram disabled, приложение стартует

### Telegram-бот

- `BotFather` `/setprivacy` → `Disable` + удалить/заново добавить бота в группу, иначе упоминания с тегом не доходят
- `LOG_LEVEL=debug` в `.env` чтобы видеть debug-лог упоминания (дефолт `info` скрывает)
- `BOT_TOKEN` только в локальном `.env`, при утечке — `/revoke` в `BotFather`

### Без Docker

- требования: `Bun 1.4.2` (как `ARG BUN_VERSION` в `Dockerfile`), клонировать с `--recurse-submodules`
- клон: `git clone --recurse-submodules <repo>` + `cd`
- подготовка: `cp .env.example .env`
- зависимости: `bun install`
- dev: `bun run dev`
- сборка + запуск: `bun run build` + `bun dist/main.js`
- стоп: `Ctrl+C`
- env-имена `BOT_TOKEN` `BOT_TAG` `LOG_LEVEL` `NODE_ENV` `PORT` (без значений)
- stub: пустой `BOT_TOKEN` — Telegram disabled, приложение стартует
- `PORT` зарезервирован, HTTP/health endpoint нет

## Production запуск

- старт: `docker compose -f compose.yaml -f compose.prod.yaml up -d --build`
- стоп: `docker compose -f compose.yaml -f compose.prod.yaml down`
- `NODE_ENV=production`, тот же порт, секреты только через `env_file`/`environment`

## Внедрение модуля

Шаги для переноса telegram-бота в другое NestJS-приложение.

1. Установка зависимостей (имена+версии как в `package.json`):
   - `bun add telegraf@^4.16.3 zod@^4.1.5 dotenv@^17.2.1 reflect-metadata@^0.2.2 @nestjs/common@^11.1.6 @nestjs/core@^11.1.6 rxjs@^7.8.1`
2. Скопировать `src/config/*`:
   - `src/config/env.schema.ts` (`envSchema`, тип `Env`)
   - `src/config/config.service.ts` (`ConfigService` с методом `get`)
   - `src/config/config.module.ts` (`ConfigModule` — `@Global()`, отдельно импортировать нигде не нужно)
3. Скопировать `src/telegram/*`:
   - `src/telegram/telegram.module.ts` (`TelegramModule`: `controllers: [TelegramController]`, `providers`/`exports: [TelegramService]`)
   - `src/telegram/telegram.service.ts` (`TelegramService implements OnModuleInit, OnModuleDestroy`: `onModuleInit`, `startWithRetry`, `createBot`, `scheduleRetry`, `onModuleDestroy`)
   - `src/telegram/telegram.controller.ts` (`TelegramController` `@Controller('telegram')`, `@Get('health')` `health()`)
4. Подключить оба модуля в `AppModule` целевого приложения:
   ```ts
   import { Module } from '@nestjs/common';
   import { ConfigModule } from './config/config.module.js';
   import { TelegramModule } from './telegram/telegram.module.js';

   @Module({
     imports: [ConfigModule, TelegramModule],
   })
   export class AppModule {}
   ```
5. Bootstrap (как в `src/main.ts`): `NestFactory.createApplicationContext(AppModule)` + `enableShutdownHooks()` + `init()`:
   ```ts
   import 'dotenv/config';
   import 'reflect-metadata';
   import { NestFactory } from '@nestjs/core';
   import { AppModule } from './app.module.js';

   const app = await NestFactory.createApplicationContext(AppModule);
   app.enableShutdownHooks();
   await app.init();
   ```
   - polling (`TELEGRAM_MODE=polling`): этого достаточно, `bot.launch()` без опций;
   - webhook (`TELEGRAM_MODE=webhook`): тот же `createApplicationContext`, дополнительно задать env `WEBHOOK_DOMAIN`, `WEBHOOK_PATH`, `PORT` — `bot.launch({ webhook: { domain, port, hookPath } })` поднимает Telegraf webhook-listener сам.
6. Настроить `.env`: `cp .env.example .env`, заполнить ключи из таблицы ниже.
7. Проверка:
   - stub: пустой `BOT_TOKEN` — лог `Telegram disabled (no BOT_TOKEN)`, приложение стартует;
   - polling/webhook: лог `Telegram polling started` / `Telegram webhook started`;
   - упоминание тега в чате: `LOG_LEVEL=debug` чтобы увидеть `Telegram mention received`, бот отвечает `ack: <текст>`.

### Env-ключи (только имена, без значений)

| Ключ | Назначение / дефолт |
| --- | --- |
| `BOT_TOKEN` | Токен от `BotFather`. Пусто = stub (`Telegram disabled`), polling/webhook не стартуют |
| `BOT_TAG` | Тег, на который реагирует `createBot` (`message.text.includes(tag)`). Дефолт `@bot`, обязан начинаться с `@` |
| `TELEGRAM_MODE` | `polling` \| `webhook`. Дефолт `polling` |
| `WEBHOOK_DOMAIN` | Публичный https URL, обязателен при `TELEGRAM_MODE=webhook`. Дефолта нет |
| `WEBHOOK_PATH` | Путь webhook-listener. Дефолт `/telegram-webhook`, обязан начинаться с `/` |
| `PORT` | Порт Telegraf webhook-listener в webhook-режиме. Дефолт `3000` |
| `LOG_LEVEL` | `debug` \| `info` \| `warn` \| `error`. Дефолт `info` |
| `NODE_ENV` | `development` \| `test` \| `production`. Дефолт `development` |

### Примечания

- `TelegramController` (`GET telegram/health`) под application-context inactive — HTTP-драйвера нет (см. комментарий в `src/main.ts`), health проверяется через логи, не через HTTP.
- `LOG_LEVEL=debug` обязателен чтобы видеть `Telegram mention received` (`logger.debug` в `createBot`), дефолт `info` его скрывает.
- Degraded-режимы (приложение продолжает работать):
  - пустой `BOT_TOKEN` → `Telegram disabled (no BOT_TOKEN)`;
  - `TELEGRAM_MODE=webhook` без `WEBHOOK_DOMAIN` → `Telegram webhook unavailable, running degraded: WEBHOOK_DOMAIN is required...`;
  - неудачный `launch` → 3 попытки с паузой 3с (`Telegram <label> launch attempt <n> failed..., retrying...`), затем `Telegram <label> unavailable, running degraded: ...` + ретрай через `scheduleRetry` каждые 30с.
- `BotFather` `/setprivacy` → `Disable` + удалить/заново добавить бота в группу, иначе упоминания с тегом не доходят.
