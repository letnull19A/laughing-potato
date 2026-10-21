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
