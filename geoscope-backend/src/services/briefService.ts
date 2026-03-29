import type { AiProvider } from "../providers/aiProvider";
import type { CountryBriefData, CountryBriefResponse } from "../types/brief";
import { cacheKeys } from "../utils/cacheKeys";
import type { CacheStore } from "../lib/redis";
import { dedup } from "../utils/inflight";
import { NewsService } from "./newsService";

const BRIEF_CACHE_TTL_SECONDS = 15 * 60;
const BRIEF_ARTICLE_LIMIT = 8;

interface BriefServiceOptions {
  aiProvider: AiProvider;
  cacheStore: CacheStore;
  newsService: NewsService;
}

export class BriefService {
  private readonly aiProvider: AiProvider;
  private readonly cacheStore: CacheStore;
  private readonly newsService: NewsService;

  constructor(options: BriefServiceOptions) {
    this.aiProvider = options.aiProvider;
    this.cacheStore = options.cacheStore;
    this.newsService = options.newsService;
  }

  async getCountryBrief(countryCode: string): Promise<CountryBriefResponse> {
    const normalizedCountryCode = countryCode.toUpperCase();
    const cacheKey = cacheKeys.brief(normalizedCountryCode);

    return dedup(cacheKey, () => this.computeBrief(normalizedCountryCode, cacheKey));
  }

  private async computeBrief(normalizedCountryCode: string, cacheKey: string): Promise<CountryBriefResponse> {
    const cached = await this.cacheStore.getJson<CountryBriefData>(cacheKey);

    if (cached) {
      return {
        ...cached,
        cached: true,
      };
    }

    const news = await this.newsService.getCountryNews({
      countryCode: normalizedCountryCode,
      limit: BRIEF_ARTICLE_LIMIT,
    });

    const draft = await this.aiProvider.generateBrief({
      countryCode: news.countryCode,
      countryName: news.countryName,
      articles: news.articles,
    });

    const response: CountryBriefData = {
      countryCode: news.countryCode,
      summary: draft.summary,
      sentiment: draft.sentiment,
      keyActors: draft.keyActors,
      topicTags: draft.topicTags,
      articleCount: news.articles.length,
    };

    await this.cacheStore.setJson(cacheKey, response, BRIEF_CACHE_TTL_SECONDS);

    return {
      ...response,
      cached: false,
    };
  }
}
