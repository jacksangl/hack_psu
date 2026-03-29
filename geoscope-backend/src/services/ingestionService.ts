import { logger } from "../lib/logger";
import type { NewsProvider, ProviderNewsArticle } from "../providers/newsProvider";
import { NewsRepository } from "../repositories/newsRepository";
import type { IngestionResponse } from "../types/ingestion";
import { averageSentimentScore, labelFromScore } from "../utils/sentiment";
import { getCountryName, getSupportedCountryCodes, normalizeCountryCode } from "../utils/countryCodeMap";
import { normalizeArticles } from "../utils/articleNormalizer";
import { dedupeProviderArticles } from "../utils/articleDeduper";

const INGEST_FETCH_LIMIT = 20;
const INGEST_STORE_LIMIT = 10;
const SNAPSHOT_STALE_AFTER_MS = 24 * 60 * 60 * 1000;
const INGEST_CONCURRENCY = parseInt(process.env.INGEST_CONCURRENCY ?? "20", 10);
const INGEST_BATCH_DELAY_MS = parseInt(process.env.INGEST_BATCH_DELAY_MS ?? "100", 10);

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

interface IngestionServiceOptions {
  provider: NewsProvider;
  repository: NewsRepository;
}

export class IngestionService {
  private readonly provider: NewsProvider;
  private readonly repository: NewsRepository;

  constructor(options: IngestionServiceOptions) {
    this.provider = options.provider;
    this.repository = options.repository;
  }

  async ingest(request?: { countryCode?: string }): Promise<IngestionResponse> {
    const countryCodes = request?.countryCode
      ? [normalizeCountryCode(request.countryCode)]
      : getSupportedCountryCodes();

    const startedAt = new Date().toISOString();
    const runId = await this.repository.createIngestionRun(startedAt, countryCodes.length);
    let countriesSucceeded = 0;
    const errors: string[] = [];

    logger.info("ingest run started", {
      runId,
      totalCountries: countryCodes.length,
      concurrency: INGEST_CONCURRENCY,
    });

    // Process in batches with bounded concurrency
    for (let i = 0; i < countryCodes.length; i += INGEST_CONCURRENCY) {
      const batch = countryCodes.slice(i, i + INGEST_CONCURRENCY);
      const batchNum = Math.floor(i / INGEST_CONCURRENCY) + 1;
      const totalBatches = Math.ceil(countryCodes.length / INGEST_CONCURRENCY);

      logger.info("ingest batch started", {
        batch: batchNum,
        totalBatches,
        countries: batch.join(","),
      });

      const results = await Promise.allSettled(
        batch.map((countryCode) => this.ingestCountry(countryCode))
      );

      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        const countryCode = batch[j];
        if (result.status === "fulfilled") {
          if (result.value) {
            countriesSucceeded += 1;
          }
          // value is false if 0 articles but no error — not counted as failure
        } else {
          const msg = result.reason instanceof Error ? result.reason.message : "unknown error";
          errors.push(`${countryCode}: ${msg}`);
        }
      }

      logger.info("ingest batch completed", {
        batch: batchNum,
        totalBatches,
        succeededSoFar: countriesSucceeded,
        errorsSoFar: errors.length,
      });

      if (i + INGEST_CONCURRENCY < countryCodes.length && INGEST_BATCH_DELAY_MS > 0) {
        await sleep(INGEST_BATCH_DELAY_MS);
      }
    }

    const finishedAt = new Date().toISOString();
    const status = errors.length > 0 && countriesSucceeded === 0 ? "failed" : "completed";
    const errorSummary = errors.length > 0 ? errors.slice(0, 25).join(" | ") : null;

    await this.repository.completeIngestionRun(runId, {
      countriesSucceeded,
      errorSummary,
      finishedAt,
      status,
    });

    logger.info("ingest run finished", {
      runId,
      status,
      countriesAttempted: countryCodes.length,
      countriesSucceeded,
      countriesFailed: errors.length,
    });

    return {
      countriesAttempted: countryCodes.length,
      countriesSucceeded,
      finishedAt,
      runId,
      startedAt,
      status,
    };
  }

  /** Ingest a single country. Returns true if articles were stored. */
  private async ingestCountry(countryCode: string): Promise<boolean> {
    const countryName = getCountryName(countryCode);

    if (!countryName) {
      logger.warn("skipping unsupported country", { countryCode });
      return false;
    }

    try {
      const fetchedArticles = await this.provider.fetchCountryNews({
        countryCode,
        countryName,
        limit: INGEST_FETCH_LIMIT,
      });

      const dedupedArticles = this.sortProviderArticles(dedupeProviderArticles(fetchedArticles)).slice(0, INGEST_STORE_LIMIT);

      logger.info("country fetch completed", {
        countryCode,
        provider: this.provider.name,
        fetched: fetchedArticles.length,
        deduped: dedupedArticles.length,
      });

      if (dedupedArticles.length === 0) {
        await this.markCountryStaleIfNeeded(countryCode);
        return false;
      }

      const refreshedAt = new Date().toISOString();
      const normalizedArticles = normalizeArticles(dedupedArticles, {
        countryCode,
        countryName,
      }).map((article, index) => ({
        ...article,
        fetchedAt: refreshedAt,
        provider: this.provider.name,
        rawId: dedupedArticles[index].rawId ?? null,
        toneScore: dedupedArticles[index].toneScore ?? null,
      }));

      const sentimentScore = averageSentimentScore(normalizedArticles.map((a) => a.sentiment.score));
      const sentimentLabel = labelFromScore(sentimentScore);
      const sourceCount = new Set(normalizedArticles.map((a) => a.source.toLowerCase())).size;

      await this.repository.replaceCountryData({
        articles: normalizedArticles,
        countryCode,
        countryName,
        provider: this.provider.name,
        refreshedAt,
        sentimentLabel,
        sentimentScore,
        sourceCount,
      });

      return true;
    } catch (error) {
      await this.markCountryStaleIfNeeded(countryCode);
      logger.warn("country ingestion failed", {
        countryCode,
        error: error instanceof Error ? error.message : "unknown",
        provider: this.provider.name,
      });
      throw error; // re-throw so Promise.allSettled captures it
    }
  }

  private async markCountryStaleIfNeeded(countryCode: string): Promise<void> {
    const staleBefore = new Date(Date.now() - SNAPSHOT_STALE_AFTER_MS).toISOString();
    await this.repository.markCountryStaleIfExpired(countryCode, staleBefore);
  }

  private sortProviderArticles(articles: ProviderNewsArticle[]): ProviderNewsArticle[] {
    return [...articles].sort((left, right) => {
      const leftTime = Date.parse(left.publishedAt);
      const rightTime = Date.parse(right.publishedAt);
      return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime);
    });
  }
}
