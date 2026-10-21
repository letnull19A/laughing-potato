# syntax=docker/dockerfile:1

# Pinned Bun version (matches local toolchain 1.4.2).
ARG BUN_VERSION=1.4.2

# ------------------------------------------------------------------
# deps: install dependencies once, cached separately from source COPY
# ------------------------------------------------------------------
FROM oven/bun:${BUN_VERSION}-slim AS deps

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ------------------------------------------------------------------
# build: compile TypeScript to dist/
# ------------------------------------------------------------------
FROM oven/bun:${BUN_VERSION}-slim AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json bun.lock tsconfig.json ./
COPY src ./src
RUN bun run build

# ------------------------------------------------------------------
# runtime: production-only deps, non-root user
# ------------------------------------------------------------------
FROM oven/bun:${BUN_VERSION}-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV BOT_TAG=bot
ENV LOG_LEVEL=info
ENV PORT=3000

COPY package.json bun.lock ./
RUN bun install --production --frozen-lockfile

COPY --from=build /app/dist ./dist

RUN groupadd -r app --gid 10001 \
  && useradd -r -g app --uid 10001 --create-home app \
  && mkdir -p /app/data \
  && chown -R app:app /app

USER app

EXPOSE 3000

CMD ["bun", "dist/main.js"]
