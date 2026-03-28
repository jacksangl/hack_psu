import type { CacheStore } from "../lib/redis";
import type { CountryComparisonData, CountryComparisonResponse } from "../types/comparison";
import { cacheKeys } from "../utils/cacheKeys";
import { averageSentimentScore } from "../utils/sentiment";
import { BriefService } from "./briefService";
import { NewsService } from "./newsService";

const COMPARE_CACHE_TTL_SECONDS = 15 * 60;

interface CompareServiceOptions {
  briefService: BriefService;
  cacheStore: CacheStore;
  newsService: NewsService;
}

const intersect = (left: string[], right: string[]): string[] => {
  const rightSet = new Set(right.map((value) => value.toLowerCase()));

  return left.filter((value, index) => {
    const normalized = value.toLowerCase();
    return rightSet.has(normalized) && left.findIndex((candidate) => candidate.toLowerCase() === normalized) === index;
  });
};

export class CompareService {
  private readonly briefService: BriefService;
  private readonly cacheStore: CacheStore;
  private readonly newsService: NewsService;

  constructor(options: CompareServiceOptions) {
    this.briefService = options.briefService;
    this.cacheStore = options.cacheStore;
    this.newsService = options.newsService;
  }

  async compare(countryA: string, countryB: string): Promise<CountryComparisonResponse> {
    const leftCode = countryA.toUpperCase();
    const rightCode = countryB.toUpperCase();
    const cacheKey = cacheKeys.compare(leftCode, rightCode);
    const cached = await this.cacheStore.getJson<CountryComparisonData>(cacheKey);

    if (cached) {
      return {
        ...cached,
        cached: true,
      };
    }

    const [leftBrief, rightBrief, leftNews, rightNews] = await Promise.all([
      this.briefService.getCountryBrief(leftCode),
      this.briefService.getCountryBrief(rightCode),
      this.newsService.getCountryNews({ countryCode: leftCode, limit: 8 }),
      this.newsService.getCountryNews({ countryCode: rightCode, limit: 8 }),
    ]);

    const leftScore = averageSentimentScore(leftNews.articles.map((article) => article.sentiment.score));
    const rightScore = averageSentimentScore(rightNews.articles.map((article) => article.sentiment.score));

    const response: CountryComparisonData = {
      left: {
        countryCode: leftBrief.countryCode,
        summary: leftBrief.summary,
        sentiment: leftBrief.sentiment,
        keyActors: leftBrief.keyActors,
        topicTags: leftBrief.topicTags,
        articleCount: leftBrief.articleCount,
      },
      right: {
        countryCode: rightBrief.countryCode,
        summary: rightBrief.summary,
        sentiment: rightBrief.sentiment,
        keyActors: rightBrief.keyActors,
        topicTags: rightBrief.topicTags,
        articleCount: rightBrief.articleCount,
      },
      comparison: {
        sharedTopics: intersect(leftBrief.topicTags, rightBrief.topicTags),
        sentimentContrast: {
          left: leftBrief.sentiment,
          right: rightBrief.sentiment,
          delta: Number((leftScore - rightScore).toFixed(3)),
        },
        actorOverlap: intersect(leftBrief.keyActors, rightBrief.keyActors),
      },
    };

    await this.cacheStore.setJson(cacheKey, response, COMPARE_CACHE_TTL_SECONDS);

    return {
      ...response,
      cached: false,
    };
  }
}
