import { AppError } from "../lib/errors";
import { logger } from "../lib/logger";
import type { CacheStore } from "../lib/redis";
import type { NewsResponse, NewsResponseData } from "../types/article";
import { cacheKeys } from "../utils/cacheKeys";
import { normalizeCountryCode, getCountryName } from "../utils/countryCodeMap";
import { normalizeArticles } from "../utils/articleNormalizer";
import type {
  FetchCountryNewsParams,
  NewsProvider,
  NewsProviderQueryMode,
  ProviderNewsArticle,
} from "../providers/newsProvider";

const FULL_NEWS_CACHE_TTL_SECONDS = 15 * 60;
const SPARSE_NEWS_CACHE_TTL_SECONDS = 90;
const MINIMUM_COUNTRY_ARTICLE_TARGET = 5;

type FetchAttemptStrategy = "newsapi-top-headlines" | "newsapi-everything" | "gdelt";

interface FetchAttempt {
  provider: NewsProvider;
  queryMode?: NewsProviderQueryMode;
  strategy: FetchAttemptStrategy;
}

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
    const targetCount = Math.min(params.limit, MINIMUM_COUNTRY_ARTICLE_TARGET);

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
      this.logCacheEvent("country news cache hit", {
        countryCode,
        cacheStatus: this.getCacheStatus(cached.articles.length, targetCount),
        requestedCount: params.limit,
        returnedCount: cached.articles.length,
        targetCount,
      });

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

    const articles = await this.collectUntilTargetCount(providerParams, targetCount);
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

    const cacheTtl = normalizedArticles.length >= targetCount ? FULL_NEWS_CACHE_TTL_SECONDS : SPARSE_NEWS_CACHE_TTL_SECONDS;
    await this.cacheStore.setJson(cacheKey, response, cacheTtl);
    this.logCacheEvent("country news cached", {
      countryCode,
      cacheStatus: this.getCacheStatus(normalizedArticles.length, targetCount),
      requestedCount: params.limit,
      returnedCount: normalizedArticles.length,
      targetCount,
      ttlSeconds: cacheTtl,
    });

    return {
      ...response,
      cached: false,
    };
  }

  private async collectUntilTargetCount(
    params: FetchCountryNewsParams,
    targetCount: number,
  ): Promise<ProviderNewsArticle[]> {
    const attempts = this.buildFetchAttempts(params);
    let mergedArticles: ProviderNewsArticle[] = [];
    const failedProviders = new Set<string>();

    for (const attempt of attempts) {
      try {
        const fetchedArticles = await attempt.provider.fetchCountryNews({
          ...params,
          queryMode: attempt.queryMode,
        });
        mergedArticles = this.dedupeArticles([...mergedArticles, ...fetchedArticles]);
        logger.info("country news fetch attempt completed", {
          countryCode: params.countryCode,
          dedupedCount: mergedArticles.length,
          provider: attempt.provider.name,
          requestedCount: params.limit,
          returnedCount: fetchedArticles.length,
          strategy: attempt.strategy,
          targetCount,
        });

        if (mergedArticles.length >= targetCount) {
          break;
        }
      } catch (error) {
        failedProviders.add(attempt.provider.name);
        logger.warn("country news fetch attempt failed", {
          countryCode: params.countryCode,
          message: error instanceof Error ? error.message : "unknown provider error",
          provider: attempt.provider.name,
          strategy: attempt.strategy,
        });
      }
    }

    if (mergedArticles.length === 0 && failedProviders.size === new Set(attempts.map((attempt) => attempt.provider.name)).size) {
      throw new AppError(502, "PROVIDER_ERROR", "Unable to fetch country news from external providers.", {
        countryCode: params.countryCode,
        providersTried: Array.from(failedProviders),
      });
    }

    return [...mergedArticles].sort((left, right) => this.getPublishedAtTimestamp(right) - this.getPublishedAtTimestamp(left));
  }

  private buildFetchAttempts(params: FetchCountryNewsParams): FetchAttempt[] {
    const attempts: FetchAttempt[] = [];

    if (!params.from && !params.to && !params.topic) {
      attempts.push({
        provider: this.primaryProvider,
        queryMode: "top-headlines",
        strategy: "newsapi-top-headlines",
      });
    }

    attempts.push({
      provider: this.primaryProvider,
      queryMode: "everything",
      strategy: "newsapi-everything",
    });

    attempts.push({
      provider: this.secondaryProvider,
      strategy: "gdelt",
    });

    return attempts;
  }

  private dedupeArticles(articles: ProviderNewsArticle[]): ProviderNewsArticle[] {
    const seenUrls = new Set<string>();
    const seenRawIds = new Set<string>();
    const seenFallbackKeys = new Set<string>();
    const deduped: ProviderNewsArticle[] = [];

    for (const article of articles) {
      const urlKey = article.url.trim();
      const rawIdKey = article.rawId?.trim();
      const fallbackKey = [article.title.trim(), urlKey, article.publishedAt].join("|");

      if (seenUrls.has(urlKey) || (rawIdKey && seenRawIds.has(rawIdKey)) || seenFallbackKeys.has(fallbackKey)) {
        continue;
      }

      seenUrls.add(urlKey);
      if (rawIdKey) {
        seenRawIds.add(rawIdKey);
      }
      seenFallbackKeys.add(fallbackKey);
      deduped.push(article);
    }

    return deduped;
  }

  private getPublishedAtTimestamp(article: ProviderNewsArticle): number {
    const parsed = Date.parse(article.publishedAt);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  private getCacheStatus(articleCount: number, targetCount: number): "full" | "sparse" {
    return articleCount >= targetCount ? "full" : "sparse";
  }

  private logCacheEvent(
    message: string,
    meta: {
      countryCode: string;
      cacheStatus: "full" | "sparse";
      requestedCount: number;
      returnedCount: number;
      targetCount: number;
      ttlSeconds?: number;
    },
  ): void {
    logger.info(message, meta);
  }
}
