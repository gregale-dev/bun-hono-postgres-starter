import fs from 'node:fs/promises';
import path from 'node:path';
import postgres from 'postgres';

export interface MigrationRunner {
  ensureTable(): Promise<void>;
  listApplied(): Promise<string[]>;
  applyInTransaction(version: string, sqlText: string): Promise<void>;
}

export function selectDatabaseUrl(env: Record<string, string | undefined> = process.env): string {
  const url = (env.MIGRATION_DATABASE_URL || env.DATABASE_URL || '').trim();
  if (!url) {
    throw new Error('MIGRATION_DATABASE_URL or DATABASE_URL must be set');
  }
  return url;
}

export async function applyMigrations(
  runner: MigrationRunner,
  migrationsDir: string = path.resolve(import.meta.dir, '../migrations')
): Promise<string[]> {
  await runner.ensureTable();
  const applied = new Set(await runner.listApplied());
  const entries = (await fs.readdir(migrationsDir))
    .filter((name) => name.endsWith('.sql'))
    .sort();

  const newlyApplied: string[] = [];
  for (const file of entries) {
    const version = path.basename(file, '.sql');
    if (applied.has(version)) continue;
    const sqlText = await fs.readFile(path.join(migrationsDir, file), 'utf8');
    await runner.applyInTransaction(version, sqlText);
    newlyApplied.push(version);
  }
  return newlyApplied;
}

export function createPostgresRunner(databaseUrl: string): {
  runner: MigrationRunner;
  close: () => Promise<void>;
} {
  const sql = postgres(databaseUrl, { max: 1 });
  const runner: MigrationRunner = {
    async ensureTable() {
      await sql.unsafe(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version TEXT PRIMARY KEY,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `);
    },
    async listApplied() {
      const rows = await sql<{ version: string }[]>`
        SELECT version FROM schema_migrations ORDER BY version
      `;
      return rows.map((r) => r.version);
    },
    async applyInTransaction(version: string, sqlText: string) {
      await sql.begin(async (tx) => {
        await tx.unsafe(sqlText);
        await tx`INSERT INTO schema_migrations (version) VALUES (${version})`;
      });
    },
  };
  return {
    runner,
    close: () => sql.end({ timeout: 5 }),
  };
}

if (import.meta.main) {
  const url = selectDatabaseUrl();
  const { runner, close } = createPostgresRunner(url);
  try {
    const applied = await applyMigrations(runner);
    console.log(JSON.stringify({ applied }));
  } finally {
    await close();
  }
}
