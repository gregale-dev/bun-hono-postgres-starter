import postgres from 'postgres';

export interface Item {
  id: number;
  name: string;
  done: boolean;
  created_at: string;
}

export interface ItemStore {
  list(): Promise<Item[]>;
  create(name: string): Promise<Item>;
  toggle(id: number, done: boolean): Promise<Item | null>;
  remove(id: number): Promise<boolean>;
}

export class InMemoryItemStore implements ItemStore {
  private nextId = 1;
  private items = new Map<number, Item>();

  async list(): Promise<Item[]> {
    return Array.from(this.items.values()).sort((a, b) => b.id - a.id);
  }

  async create(name: string): Promise<Item> {
    const item: Item = {
      id: this.nextId++,
      name,
      done: false,
      created_at: new Date().toISOString(),
    };
    this.items.set(item.id, item);
    return item;
  }

  async toggle(id: number, done: boolean): Promise<Item | null> {
    const existing = this.items.get(id);
    if (!existing) return null;
    const updated: Item = { ...existing, done };
    this.items.set(id, updated);
    return updated;
  }

  async remove(id: number): Promise<boolean> {
    return this.items.delete(id);
  }
}

export class PostgresItemStore implements ItemStore {
  private sql: postgres.Sql;

  constructor(databaseUrl: string) {
    this.sql = postgres(databaseUrl, { max: 5, idle_timeout: 20 });
  }

  async list(): Promise<Item[]> {
    const rows = await this.sql<Item[]>`
      SELECT id::int AS id, name, done, created_at::text AS created_at
      FROM items
      ORDER BY id DESC
      LIMIT 100
    `;
    return rows;
  }

  async create(name: string): Promise<Item> {
    const [row] = await this.sql<Item[]>`
      INSERT INTO items (name)
      VALUES (${name})
      RETURNING id::int AS id, name, done, created_at::text AS created_at
    `;
    return row;
  }

  async toggle(id: number, done: boolean): Promise<Item | null> {
    const rows = await this.sql<Item[]>`
      UPDATE items
      SET done = ${done}
      WHERE id = ${id}
      RETURNING id::int AS id, name, done, created_at::text AS created_at
    `;
    return rows[0] ?? null;
  }

  async remove(id: number): Promise<boolean> {
    const rows = await this.sql<{ id: number }[]>`
      DELETE FROM items WHERE id = ${id} RETURNING id::int AS id
    `;
    return rows.length > 0;
  }
}

export function createStoreFromEnv(): ItemStore {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    return new InMemoryItemStore();
  }
  return new PostgresItemStore(databaseUrl);
}
