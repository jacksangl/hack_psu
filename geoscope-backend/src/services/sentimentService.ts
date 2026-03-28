import { AppError } from "../lib/errors";
import { logger } from "../lib/logger";
import type { CacheStore } from "../lib/redis";
import type { GlobalSentimentEntry, GlobalSentimentResponse } from "../types/sentiment";
import { cacheKeys } from "../utils/cacheKeys";
import { averageSentimentScore, labelFromScore } from "../utils/sentiment";
import { NewsService } from "./newsService";

const SENTIMENT_CACHE_TTL_SECONDS = 30 * 60;
const TRACKED_COUNTRIES = ["US", "CA", "BR", "GB", "FR", "DE", "ZA", "NG", "IN", "JP", "AU", "UA"];

interface SentimentServiceOptions {
  cacheStore: CacheStore;
  newsService: NewsService;
}

export class SentimentService {
  private readonly cacheStore: CacheStore;
  private readonly newsService: NewsService;

  constructor(options: SentimentServiceOptions) {
    this.cacheStore = options.cacheStore;
    this.newsService = options.newsService;
  }

  async getGlobalSentiment(): Promise<GlobalSentimentResponse> {
    const cacheKey = cacheKeys.sentimentGlobal();
    const cached = await this.cacheStore.getJson<Omit<GlobalSentimentResponse, "cached">>(cacheKey);

    if (cached) {
      return {
        ...cached,
        cached: true,
      };
    }

    const results = await Promise.allSettled(
      TRACKED_COUNTRIES.map((countryCode) =>
        this.newsService.getCountryNews({
          countryCode,
          limit: 10,
        }),
      ),
    );

    const countries: GlobalSentimentEntry[] = [];

    for (const result of results) {
      if (result.status === "rejected") {
        logger.warn("tracked country sentiment fetch failed", {
          message: result.reason instanceof Error ? result.reason.message : "unknown tracked country error",
        });
        continue;
      }

      if (result.value.articles.length === 0) {
        continue;
      }

      const sentimentScore = averageSentimentScore(
        result.value.articles.map((article) => article.sentiment.score),
      );

      countries.push({
        countryCode: result.value.countryCode,
        countryName: result.value.countryName,
        sentimentScore,
        sentimentLabel: labelFromScore(sentimentScore),
        articleCount: result.value.articles.length,
      });
    }

    if (countries.length === 0) {
      throw new AppError(502, "PROVIDER_ERROR", "Unable to compute global sentiment from tracked countries.");
    }

    const response = {
      updatedAt: new Date().toISOString(),
      countries: countries.sort((left, right) => left.countryName.localeCompare(right.countryName)),
    };

    await this.cacheStore.setJson(cacheKey, response, SENTIMENT_CACHE_TTL_SECONDS);

    return {
      ...response,
      cached: false,
    };
  }
}
