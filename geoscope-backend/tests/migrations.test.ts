import type { QueryResult } from "pg";
import { newDb } from "pg-mem";
import { afterEach, describe, expect, it } from "vitest";

import { runMigrations } from "../src/lib/migrations";

describe("runMigrations", () => {
  const clients: Array<{ end(): Promise<void> }> = [];

  afterEach(async () => {
    await Promise.all(clients.map((client) => client.end()));
    clients.length = 0;
  });

  it("creates the ingestion tables on a clean database", async () => {
    const db = newDb();
    const adapter = db.adapters.createPg();
    const client = new adapter.Client();
    clients.push(client);
    await client.connect();

    await runMigrations(client);

    const tables = (await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)) as QueryResult<{ table_name: string }>;

    expect(tables.rows.map((row) => row.table_name)).toEqual([
      "country_articles",
      "country_snapshots",
      "ingestion_runs",
      "schema_migrations",
    ]);
  });
});
