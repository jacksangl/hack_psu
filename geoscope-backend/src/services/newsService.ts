import { AppError } from "../lib/errors";
import { logger } from "../lib/logger";
import type { CacheStore } from "../lib/redis";
import type { NewsResponse, NewsResponseData } from "../types/article";
import { cacheKeys } from "../utils/cacheKeys";
import { normalizeCountryCode, getCountryName } from "../utils/countryCodeMap";
import { normalizeArticles } from "../utils/articleNormalizer";
import type { FetchCountryNewsParams, NewsProvider, ProviderNewsArticle } from "../providers/newsProvider";

const NEWS_CACHE_TTL_SECONDS = 15 * 60;

interface NewsServiceOptions {
  primaryProvider: NewsProvider;
  secondaryProvider: NewsProvider;
  cacheStore: CacheStore;
}

export class NewsService {
  private readonly primaryProvider: NewsProvider;
  private readonly secondaryProvider: NewsProvider;
  private readonly cacheStore: CacheStore;

  constructor(options: NewsServiceOptions) {
    this.primaryProvider = options.primaryProvider;
    this.secondaryProvider = options.secondaryProvider;
    this.cacheStore = options.cacheStore;
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
    const cached = await this.cacheStore.getJson<NewsResponseData>(cacheKey);

    if (cached) {
      return {
        ...cached,
        cached: true,
      };
    }

    const providerParams: FetchCountryNewsParams = {
      countryCode,
      countryName,
      limit: params.limit,
      from: params.from,
      to: params.to,
      topic: params.topic,
    };

    const articles = await this.fetchWithFallback(providerParams);
    const normalizedArticles = normalizeArticles(articles, {
      countryCode,
      countryName,
      requestedTopic: params.topic,
    }).slice(0, params.limit);

    const response: NewsResponseData = {
      countryCode,
      countryName,
      articles: normalizedArticles,
      total: normalizedArticles.length,
    };

    await this.cacheStore.setJson(cacheKey, response, NEWS_CACHE_TTL_SECONDS);

    return {
      ...response,
      cached: false,
    };
  }

  private async fetchWithFallback(params: FetchCountryNewsParams): Promise<ProviderNewsArticle[]> {
    try {
      return await this.primaryProvider.fetchCountryNews(params);
    } catch (primaryError) {
      logger.warn("primary news provider failed", {
        countryCode: params.countryCode,
        provider: this.primaryProvider.name,
        message: primaryError instanceof Error ? primaryError.message : "unknown primary provider error",
      });
    }

    try {
      return await this.secondaryProvider.fetchCountryNews(params);
    } catch (secondaryError) {
      logger.error("secondary news provider failed", {
        countryCode: params.countryCode,
        provider: this.secondaryProvider.name,
        message: secondaryError instanceof Error ? secondaryError.message : "unknown secondary provider error",
      });

      throw new AppError(502, "PROVIDER_ERROR", "Unable to fetch country news from external providers.", {
        countryCode: params.countryCode,
        providersTried: [this.primaryProvider.name, this.secondaryProvider.name],
      });
    }
  }
}
