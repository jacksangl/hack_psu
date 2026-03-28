import { logger } from "../lib/logger";
import type { NewsProvider, ProviderNewsArticle } from "../providers/newsProvider";
import { NewsRepository } from "../repositories/newsRepository";
import type { IngestionResponse } from "../types/ingestion";
import { averageSentimentScore, labelFromScore } from "../utils/sentiment";
import { getCountryName, getSupportedCountryCodes, normalizeCountryCode } from "../utils/countryCodeMap";
import { normalizeArticles } from "../utils/articleNormalizer";
import { dedupeProviderArticles } from "../utils/articleDeduper";

const INGEST_FETCH_LIMIT = 10;
const INGEST_STORE_LIMIT = 5;
const SNAPSHOT_STALE_AFTER_MS = 24 * 60 * 60 * 1000;

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

    for (const countryCode of countryCodes) {
      const countryName = getCountryName(countryCode);

      if (!countryName) {
        errors.push(`${countryCode}: unsupported country code`);
        continue;
      }

      try {
        const fetchedArticles = await this.provider.fetchCountryNews({
          countryCode,
          countryName,
          limit: INGEST_FETCH_LIMIT,
        });
        const dedupedArticles = this.sortProviderArticles(dedupeProviderArticles(fetchedArticles)).slice(0, INGEST_STORE_LIMIT);

        logger.info("country ingestion fetch completed", {
          countryCode,
          provider: this.provider.name,
          requestedCount: INGEST_FETCH_LIMIT,
          returnedCount: fetchedArticles.length,
          dedupedCount: dedupedArticles.length,
        });

        if (dedupedArticles.length === 0) {
          await this.markCountryStaleIfNeeded(countryCode);
          continue;
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

        const sentimentScore = averageSentimentScore(normalizedArticles.map((article) => article.sentiment.score));
        const sentimentLabel = labelFromScore(sentimentScore);
        const sourceCount = new Set(normalizedArticles.map((article) => article.source.toLowerCase())).size;

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
        countriesSucceeded += 1;
      } catch (error) {
        errors.push(`${countryCode}: ${error instanceof Error ? error.message : "unknown error"}`);
        await this.markCountryStaleIfNeeded(countryCode);
        logger.warn("country ingestion failed", {
          countryCode,
          message: error instanceof Error ? error.message : "unknown provider error",
          provider: this.provider.name,
        });
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

    return {
      countriesAttempted: countryCodes.length,
      countriesSucceeded,
      finishedAt,
      runId,
      startedAt,
      status,
    };
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
