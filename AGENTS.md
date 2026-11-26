# Agent instructions

This project runs on Gregale (https://gregale.dev) with Bun, Hono, TypeScript,
and managed PostgreSQL 17.

## Overview
- Entrypoint: `src/index.ts` (Hono app in `src/app.ts`)
- Database release migration: `src/migrate.ts` (`MIGRATION_DATABASE_URL`)
- Container & deploy config: `Dockerfile`, `gregale.yaml`
- Tests: `bun test`

## Deploy & database workflow
1. Put `--non-interactive --json` before `gregale` commands.
2. Deploy with `gregale --non-interactive --json deploy --name <app>`.
   `src/migrate.ts` runs as `release.command` before traffic switches.
3. Never commit `.env` files, `node_modules/`, or `DATABASE_URL` values.

More: https://gregale.dev/docs/releases and https://gregale.dev/docs/agents
