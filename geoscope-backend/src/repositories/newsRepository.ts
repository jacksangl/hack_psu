import type { PoolClient, QueryResult } from "pg";

import type { Article } from "../types/article";
import type { SentimentLabel } from "../types/sentiment";
import type { CountrySnapshotRecord, StoredCountryArticle } from "../types/storage";
import type { Database } from "../lib/db";
import { extractRelatedCountries, extractTopicsFromContent } from "../utils/articleSignals";

interface SnapshotRow {
  article_count: number;
  country_code: string;
  country_name: string;
  is_stale: boolean;
  provider: string;
  refreshed_at: Date;
  sentiment_label: SentimentLabel;
  sentiment_score: number;
  source_count: number;
}

interface ArticleRow {
  country_code: string;
  country_name: string;
  dedupe_key: string;
  description: string | null;
  image_url: string | null;
  latitude: number | null;
  location_name: string | null;
  longitude: number | null;
  published_at: Date;
  sentiment_label: SentimentLabel;
  sentiment_score: number;
  source: string;
  title: string;
  url: string;
}

interface StoredArticleRecord extends Article {
  provider: string;
  rawId: string | null;
  fetchedAt: string;
  toneScore: number | null;
}

export interface ReplaceCountryDataParams {
  articles: StoredArticleRecord[];
  countryCode: string;
  countryName: string;
  provider: string;
  refreshedAt: string;
  sentimentLabel: SentimentLabel;
  sentimentScore: number;
  sourceCount: number;
}

const mapSnapshotRow = (row: SnapshotRow): CountrySnapshotRecord => ({
  articleCount: row.article_count,
  countryCode: row.country_code,
  countryName: row.country_name,
  isStale: row.is_stale,
  provider: row.provider,
  refreshedAt: row.refreshed_at.toISOString(),
  sentimentLabel: row.sentiment_label,
  sentimentScore: Number(row.sentiment_score),
  sourceCount: row.source_count,
});

const mapArticleRow = (row: ArticleRow): StoredCountryArticle => ({
  countryCode: row.country_code,
  countryName: row.country_name,
  description: row.description,
  id: row.dedupe_key,
  imageUrl: row.image_url,
  latitude: row.latitude,
  locationName: row.location_name,
  longitude: row.longitude,
  publishedAt: row.published_at.toISOString(),
  sentiment: {
    label: row.sentiment_label,
    score: Number(row.sentiment_score),
  },
  source: row.source,
  title: row.title,
  topics: extractTopicsFromContent({
    title: row.title,
    description: row.description,
  }),
  relatedCountries: extractRelatedCountries({
    countryCode: row.country_code,
    title: row.title,
    description: row.description,
  }),
  url: row.url,
});

export class NewsRepository {
  private readonly db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async getCountryArticles(countryCode: string, limit: number): Promise<StoredCountryArticle[]> {
    const result = await this.db.query<ArticleRow>(
      `
        SELECT
          country_articles.country_code,
          country_snapshots.country_name,
          country_articles.dedupe_key,
          country_articles.title,
          country_articles.source,
          country_articles.url,
          country_articles.published_at,
          country_articles.description,
          country_articles.image_url,
          country_articles.latitude,
          country_articles.longitude,
          country_articles.location_name,
          country_articles.sentiment_score,
          country_articles.sentiment_label
        FROM country_articles
        JOIN country_snapshots
          ON country_snapshots.country_code = country_articles.country_code
        WHERE country_articles.country_code = $1
        ORDER BY country_articles.published_at DESC
        LIMIT $2
      `,
      [countryCode, limit],
    );

    return result.rows.map(mapArticleRow);
  }

  async getCountrySnapshot(countryCode: string): Promise<CountrySnapshotRecord | null> {
    const result = await this.db.query<SnapshotRow>(
      `
        SELECT
          country_code,
          country_name,
          refreshed_at,
          article_count,
          sentiment_score,
          sentiment_label,
          provider,
          source_count,
          is_stale
        FROM country_snapshots
        WHERE country_code = $1
      `,
      [countryCode],
    );

    return result.rows[0] ? mapSnapshotRow(result.rows[0]) : null;
  }

  async getGlobalSnapshots(): Promise<CountrySnapshotRecord[]> {
    const result = await this.db.query<SnapshotRow>(
      `
        SELECT
          country_code,
          country_name,
          refreshed_at,
          article_count,
          sentiment_score,
          sentiment_label,
          provider,
          source_count,
          is_stale
        FROM country_snapshots
        WHERE article_count > 0
        ORDER BY country_name ASC
      `,
    );

    return result.rows.map(mapSnapshotRow);
  }

  async getLatestSnapshotUpdate(): Promise<string | null> {
    const result = await this.db.query<{ refreshed_at: Date | null }>(
      "SELECT MAX(refreshed_at) AS refreshed_at FROM country_snapshots",
    );

    return result.rows[0]?.refreshed_at ? result.rows[0].refreshed_at.toISOString() : null;
  }

  async replaceCountryData(params: ReplaceCountryDataParams): Promise<void> {
    await this.db.transaction(async (client) => {
      await client.query("DELETE FROM country_articles WHERE country_code = $1", [params.countryCode]);

      for (const article of params.articles) {
        await client.query(
          `
            INSERT INTO country_articles (
              country_code,
              dedupe_key,
              url,
              raw_id,
              title,
              source,
              provider,
              published_at,
              description,
              image_url,
              latitude,
              longitude,
              location_name,
              tone_score,
              sentiment_score,
              sentiment_label,
              fetched_at
            )
            VALUES (
              $1, $2, $3, $4, $5, $6, $7,
              $8::timestamptz, $9, $10, $11, $12, $13, $14, $15, $16, $17::timestamptz
            )
          `,
          [
            params.countryCode,
            article.id,
            article.url,
            article.rawId,
            article.title,
            article.source,
            params.provider,
            article.publishedAt,
            article.description,
            article.imageUrl,
            article.latitude,
            article.longitude,
            article.locationName,
            article.toneScore,
            article.sentiment.score,
            article.sentiment.label,
            article.fetchedAt,
          ],
        );
      }

      await this.upsertCountrySnapshot(client, {
        articleCount: params.articles.length,
        countryCode: params.countryCode,
        countryName: params.countryName,
        isStale: false,
        provider: params.provider,
        refreshedAt: params.refreshedAt,
        sentimentLabel: params.sentimentLabel,
        sentimentScore: params.sentimentScore,
        sourceCount: params.sourceCount,
      });
    });
  }

  async markCountryStaleIfExpired(countryCode: string, staleBefore: string): Promise<void> {
    await this.db.query(
      `
        UPDATE country_snapshots
        SET is_stale = TRUE
        WHERE country_code = $1
          AND refreshed_at <= $2::timestamptz
      `,
      [countryCode, staleBefore],
    );
  }

  async createIngestionRun(startedAt: string, countriesAttempted: number): Promise<number> {
    const result = await this.db.query<{ id: number }>(
      `
        INSERT INTO ingestion_runs (
          started_at,
          status,
          countries_attempted,
          countries_succeeded
        )
        VALUES ($1::timestamptz, 'running', $2, 0)
        RETURNING id
      `,
      [startedAt, countriesAttempted],
    );

    return result.rows[0].id;
  }

  async completeIngestionRun(runId: number, summary: {
    countriesSucceeded: number;
    errorSummary: string | null;
    finishedAt: string;
    status: "completed" | "failed";
  }): Promise<void> {
    await this.db.query(
      `
        UPDATE ingestion_runs
        SET
          finished_at = $2::timestamptz,
          status = $3,
          countries_succeeded = $4,
          error_summary = $5
        WHERE id = $1
      `,
      [runId, summary.finishedAt, summary.status, summary.countriesSucceeded, summary.errorSummary],
    );
  }

  private async upsertCountrySnapshot(
    executor: Pick<PoolClient, "query">,
    params: {
      articleCount: number;
      countryCode: string;
      countryName: string;
      isStale: boolean;
      provider: string;
      refreshedAt: string;
      sentimentLabel: SentimentLabel;
      sentimentScore: number;
      sourceCount: number;
    },
  ): Promise<void> {
    await executor.query(
      `
        INSERT INTO country_snapshots (
          country_code,
          country_name,
          refreshed_at,
          article_count,
          sentiment_score,
          sentiment_label,
          provider,
          source_count,
          is_stale
        )
        VALUES ($1, $2, $3::timestamptz, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (country_code)
        DO UPDATE SET
          country_name = EXCLUDED.country_name,
          refreshed_at = EXCLUDED.refreshed_at,
          article_count = EXCLUDED.article_count,
          sentiment_score = EXCLUDED.sentiment_score,
          sentiment_label = EXCLUDED.sentiment_label,
          provider = EXCLUDED.provider,
          source_count = EXCLUDED.source_count,
          is_stale = EXCLUDED.is_stale
      `,
      [
        params.countryCode,
        params.countryName,
        params.refreshedAt,
        params.articleCount,
        params.sentimentScore,
        params.sentimentLabel,
        params.provider,
        params.sourceCount,
        params.isStale,
      ],
    );
  }
}
