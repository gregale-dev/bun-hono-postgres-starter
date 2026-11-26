import { describe, it, expect } from 'bun:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../src/app';
import { InMemoryItemStore } from '../src/store';
import { applyMigrations, selectDatabaseUrl, type MigrationRunner } from '../src/migrate';

describe('bun-hono-postgres-starter API', () => {
  it('serves /healthz and supports item CRUD', async () => {
    const app = createApp(new InMemoryItemStore());

    const health = await app.request('/healthz');
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ ok: true });

    const invalid = await app.request('/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '   ' }),
    });
    expect(invalid.status).toBe(400);

    const createdRes = await app.request('/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Ship Bun starter' }),
    });
    expect(createdRes.status).toBe(201);
    const created = (await createdRes.json()) as { id: number; name: string; done: boolean };
    expect(created.name).toBe('Ship Bun starter');
    expect(created.done).toBe(false);

    const patched = await app.request(`/items/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: true }),
    });
    expect(patched.status).toBe(200);
    expect(((await patched.json()) as { done: boolean }).done).toBe(true);

    const listed = await app.request('/items');
    expect(((await listed.json()) as { count: number }).count).toBe(1);

    const deleted = await app.request(`/items/${created.id}`, { method: 'DELETE' });
    expect(deleted.status).toBe(200);

    const missing = await app.request('/items/999', { method: 'DELETE' });
    expect(missing.status).toBe(404);
  });
});

describe('release migration runner', () => {
  it('prefers MIGRATION_DATABASE_URL over DATABASE_URL', () => {
    expect(
      selectDatabaseUrl({
        DATABASE_URL: 'postgres://rw@db/app',
        MIGRATION_DATABASE_URL: 'postgres://mig@db/app',
      })
    ).toBe('postgres://mig@db/app');
    expect(selectDatabaseUrl({ DATABASE_URL: 'postgres://rw@db/app' })).toBe('postgres://rw@db/app');
  });

  it('applies SQL files in sorted order and skips already applied versions', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'bun-hono-mig-'));
    try {
      await fs.writeFile(path.join(tmp, '002_second.sql'), 'SELECT 2;');
      await fs.writeFile(path.join(tmp, '001_first.sql'), 'SELECT 1;');

      const appliedSet = new Set<string>();
      const runner: MigrationRunner = {
        async ensureTable() {},
        async listApplied() {
          return Array.from(appliedSet).sort();
        },
        async applyInTransaction(version) {
          appliedSet.add(version);
        },
      };

      expect(await applyMigrations(runner, tmp)).toEqual(['001_first', '002_second']);
      expect(await applyMigrations(runner, tmp)).toEqual([]);
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });
});
