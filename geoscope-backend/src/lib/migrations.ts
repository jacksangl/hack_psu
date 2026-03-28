import type { DbExecutor } from "./db";

const MIGRATIONS = [
  {
    id: "001_create_ingestion_tables",
    sql: `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT,
        applied_at TIMESTAMPTZ
      );

      CREATE UNIQUE INDEX IF NOT EXISTS schema_migrations_id_idx
        ON schema_migrations (id);

      CREATE TABLE IF NOT EXISTS country_snapshots (
        country_code TEXT PRIMARY KEY,
        country_name TEXT NOT NULL,
        refreshed_at TIMESTAMPTZ NOT NULL,
        article_count INTEGER NOT NULL,
        sentiment_score DOUBLE PRECISION NOT NULL,
        sentiment_label TEXT NOT NULL,
        provider TEXT NOT NULL,
        source_count INTEGER NOT NULL,
        is_stale BOOLEAN NOT NULL DEFAULT FALSE
      );

      CREATE TABLE IF NOT EXISTS country_articles (
        id BIGSERIAL PRIMARY KEY,
        country_code TEXT NOT NULL,
        dedupe_key TEXT NOT NULL,
        url TEXT NOT NULL,
        raw_id TEXT,
        title TEXT NOT NULL,
        source TEXT NOT NULL,
        provider TEXT NOT NULL,
        published_at TIMESTAMPTZ NOT NULL,
        description TEXT,
        image_url TEXT,
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        location_name TEXT,
        tone_score DOUBLE PRECISION,
        sentiment_score DOUBLE PRECISION NOT NULL,
        sentiment_label TEXT NOT NULL,
        fetched_at TIMESTAMPTZ NOT NULL,
        CONSTRAINT country_articles_country_dedupe_unique UNIQUE (country_code, dedupe_key)
      );

      CREATE INDEX IF NOT EXISTS country_articles_country_published_idx
        ON country_articles (country_code, published_at DESC);

      CREATE TABLE IF NOT EXISTS ingestion_runs (
        id BIGSERIAL PRIMARY KEY,
        started_at TIMESTAMPTZ NOT NULL,
        finished_at TIMESTAMPTZ,
        status TEXT NOT NULL,
        countries_attempted INTEGER NOT NULL,
        countries_succeeded INTEGER NOT NULL,
        error_summary TEXT
      );
    `,
  },
];

export const runMigrations = async (db: DbExecutor): Promise<void> => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT,
      applied_at TIMESTAMPTZ
    );
  `);
  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS schema_migrations_id_idx
      ON schema_migrations (id);
  `);

  for (const migration of MIGRATIONS) {
    const existing = await db.query<{ id: string }>("SELECT id FROM schema_migrations WHERE id = $1", [migration.id]);

    if (existing.rowCount) {
      continue;
    }

    await db.query(migration.sql);
    await db.query("INSERT INTO schema_migrations (id, applied_at) VALUES ($1, NOW())", [migration.id]);
  }
};

export const getMigrations = (): Array<{ id: string; sql: string }> => MIGRATIONS;
