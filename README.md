# laughing-potato
Recive telegram action in telegram chat

# Запуск

## Локальный запуск

- подготовка: `cp .env.example .env`
- старт: `docker compose -f compose.yaml -f compose.dev.yaml up --build` (alt: `bun run dev`)
- стоп: `docker compose -f compose.yaml -f compose.dev.yaml down`
- порт `${PORT:-3000}:3000`, env-имена `BOT_TOKEN` `BOT_TAG` `LOG_LEVEL` `NODE_ENV` `PORT` (без значений)
- stub: пустой `BOT_TOKEN` — Telegram disabled, приложение стартует

## Production запуск

- старт: `docker compose -f compose.yaml -f compose.prod.yaml up -d --build`
- стоп: `docker compose -f compose.yaml -f compose.prod.yaml down`
- `NODE_ENV=production`, тот же порт, секреты только через `env_file`/`environment`
