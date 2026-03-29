import { AppError } from "../lib/errors";
import type { CacheStore } from "../lib/redis";
import { NewsRepository } from "../repositories/newsRepository";
import type { NewsResponse, NewsResponseData } from "../types/article";
import { cacheKeys } from "../utils/cacheKeys";
import { getCountryName, normalizeCountryCode } from "../utils/countryCodeMap";
import { dedup } from "../utils/inflight";

const NEWS_CACHE_TTL_SECONDS = 15 * 60;

interface NewsServiceOptions {
  cacheStore: CacheStore;
  repository: NewsRepository;
}

export class NewsService {
  private readonly cacheStore: CacheStore;
  private readonly repository: NewsRepository;

  constructor(options: NewsServiceOptions) {
    this.cacheStore = options.cacheStore;
    this.repository = options.repository;
  }

  async getCountryNews(params: {
    countryCode: string;
    limit: number;
    from?: string;
    to?: string;
    topic?: string;
  }): Promise<NewsResponse> {
    const countryCode = normalizeCountryCode(params.countryCode);
    const countryName = getCountryName(countryCode);

    if (!countryName) {
      throw new AppError(400, "BAD_REQUEST", "Unsupported ISO country code.", {
        countryCode,
      });
    }

    const query = {
      limit: params.limit,
      from: params.from,
      to: params.to,
      topic: params.topic,
    };
    const cacheKey = cacheKeys.news(countryCode, query);

    return dedup(cacheKey, () => this.computeNews(countryCode, countryName, params.limit, cacheKey));
  }

  private async computeNews(
    countryCode: string,
    countryName: string,
    limit: number,
    cacheKey: string,
  ): Promise<NewsResponse> {
    const cached = await this.cacheStore.getJson<NewsResponseData>(cacheKey);

    if (cached) {
      return {
        ...cached,
        cached: true,
      };
    }

    const storedArticles = await this.repository.getCountryArticles(countryCode, limit);
    const response: NewsResponseData = {
      countryCode,
      countryName,
      articles: storedArticles,
      total: storedArticles.length,
    };

    await this.cacheStore.setJson(cacheKey, response, NEWS_CACHE_TTL_SECONDS);

    return {
      ...response,
      cached: false,
    };
  }
}
