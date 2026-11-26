# Bun + Hono + Postgres Starter (Scale to Zero)

[![Deploy on Gregale](https://gregale.dev/deploy-badge.svg)](https://gregale.dev/deploy?repo=https://github.com/gregale-dev/bun-hono-postgres-starter)

A fast TypeScript REST API built with [Bun](https://bun.sh),
[Hono](https://hono.dev), and managed PostgreSQL 17 on
[Gregale](https://gregale.dev):

- **Pre-traffic SQL migrations:** `release.command: bun run src/migrate.ts` runs
  with `MIGRATION_DATABASE_URL` (`access: migration`) before new releases take traffic.
- **Zero-config local dev:** falls back to an in-memory store when `DATABASE_URL`
  is unset so `bun test` and `bun run dev` work immediately; uses `postgres.js`
  when `DATABASE_URL` is configured.
- **Scale to zero:** `/healthz` never touches Postgres, so both the Bun MicroVM
  and managed database suspend when idle.

## Run locally

```sh
bun install
bun test
bun run dev
```

To run against a local Postgres container:

```sh
docker run -d --name bun-hono-db -e POSTGRES_PASSWORD=dev -p 5432:5432 postgres:17
export DATABASE_URL=postgresql://postgres:dev@localhost:5432/postgres
bun run migrate
bun run dev
```

## Deploy to Gregale

```sh
gregale deploy --name my-hono-api --size small
```

`gregale.yaml` provisions the managed PostgreSQL 17 database (`bun-hono-db`),
runs `bun run src/migrate.ts` before cutover, and serves `/items` on port `8080`.

## License

MIT — see [LICENSE](./LICENSE).
