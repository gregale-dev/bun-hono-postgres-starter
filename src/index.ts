import { createApp } from './app';
import { createStoreFromEnv } from './store';

const app = createApp(createStoreFromEnv());
const port = Number.parseInt(process.env.PORT || '8080', 10);

const server = Bun.serve({
  port,
  fetch: app.fetch,
});

console.log(`bun-hono-postgres-starter listening on :${server.port}`);

function shutdown() {
  server.stop();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
