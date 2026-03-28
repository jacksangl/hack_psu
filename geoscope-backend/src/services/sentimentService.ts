import { AppError } from "../lib/errors";
import type { CacheStore } from "../lib/redis";
import { NewsRepository } from "../repositories/newsRepository";
import type { GlobalSentimentResponse } from "../types/sentiment";
import { cacheKeys } from "../utils/cacheKeys";

const SENTIMENT_CACHE_TTL_SECONDS = 30 * 60;

interface SentimentServiceOptions {
  cacheStore: CacheStore;
  repository: NewsRepository;
}

export class SentimentService {
  private readonly cacheStore: CacheStore;
  private readonly repository: NewsRepository;

  constructor(options: SentimentServiceOptions) {
    this.cacheStore = options.cacheStore;
    this.repository = options.repository;
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

    const [snapshots, latestSnapshotUpdate] = await Promise.all([
      this.repository.getGlobalSnapshots(),
      this.repository.getLatestSnapshotUpdate(),
    ]);

    const countries = snapshots
      .filter((snapshot) => !snapshot.isStale)
      .map((snapshot) => ({
        articleCount: snapshot.articleCount,
        countryCode: snapshot.countryCode,
        countryName: snapshot.countryName,
        sentimentLabel: snapshot.sentimentLabel,
        sentimentScore: snapshot.sentimentScore,
      }));

    if (countries.length === 0) {
      throw new AppError(502, "PROVIDER_ERROR", "Unable to compute global sentiment from stored snapshots.");
    }

    const response = {
      updatedAt: latestSnapshotUpdate ?? new Date().toISOString(),
      countries,
    };

    await this.cacheStore.setJson(cacheKey, response, SENTIMENT_CACHE_TTL_SECONDS);

    return {
      ...response,
      cached: false,
    };
  }
}
