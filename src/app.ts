import { Hono } from 'hono';
import type { ItemStore } from './store';

export function createApp(store: ItemStore): Hono {
  const app = new Hono();

  // Keep /healthz independent of Postgres so idle databases suspend cleanly.
  app.get('/healthz', (c) => c.json({ ok: true }));

  app.get('/items', async (c) => {
    const items = await store.list();
    return c.json({ count: items.length, items });
  });

  app.post('/items', async (c) => {
    const body = await c.req.json().catch(() => null);
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!name || name.length > 200) {
      return c.json({ error: 'valid_name_required' }, 400);
    }
    const created = await store.create(name);
    return c.json(created, 201);
  });

  app.patch('/items/:id', async (c) => {
    const id = Number(c.req.param('id'));
    if (!Number.isInteger(id) || id <= 0) {
      return c.json({ error: 'invalid_id' }, 400);
    }
    const body = await c.req.json().catch(() => null);
    if (typeof body?.done !== 'boolean') {
      return c.json({ error: 'boolean_done_required' }, 400);
    }
    const updated = await store.toggle(id, body.done);
    if (!updated) return c.json({ error: 'not_found' }, 404);
    return c.json(updated);
  });

  app.delete('/items/:id', async (c) => {
    const id = Number(c.req.param('id'));
    if (!Number.isInteger(id) || id <= 0) {
      return c.json({ error: 'invalid_id' }, 400);
    }
    const deleted = await store.remove(id);
    if (!deleted) return c.json({ error: 'not_found' }, 404);
    return c.json({ deleted: true, id });
  });

  return app;
}
