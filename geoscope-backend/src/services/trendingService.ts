import { createHash } from "node:crypto";

import type { CacheStore } from "../lib/redis";
import { getGlobalFeedItems, fetchRss, cleanHtml, type RssItem } from "../providers/rssScraperProvider";
import type { TrendingArticle, TrendingResponse, TrendingResponseData } from "../types/trending";
import { extractTopicsFromContent } from "../utils/articleSignals";
import { cacheKeys } from "../utils/cacheKeys";
import { dedup } from "../utils/inflight";

const TRENDING_CACHE_TTL_SECONDS = 10 * 60;
const MAX_ARTICLES = 30;

const US_NEWS_RSS = "https://news.google.com/rss?hl=en&gl=US&ceid=US:en";

interface TrendingServiceOptions {
  cacheStore: CacheStore;
}

function articleId(item: RssItem): string {
  return createHash("sha1")
    .update(`${item.link}:${item.title}`)
    .digest("hex")
    .slice(0, 16);
}

function primaryCategory(topics: string[]): string {
  if (topics.length === 0) return "World";
  return topics[0];
}

export class TrendingService {
  private readonly cacheStore: CacheStore;

  constructor(options: TrendingServiceOptions) {
    this.cacheStore = options.cacheStore;
  }

  async getTrending(category?: string): Promise<TrendingResponse> {
    const cacheKey = cacheKeys.trending(category);

    return dedup(cacheKey, () => this.computeTrending(category, cacheKey));
  }

  private async computeTrending(category: string | undefined, cacheKey: string): Promise<TrendingResponse> {
    const cached = await this.cacheStore.getJson<TrendingResponseData>(cacheKey);

    if (cached) {
      return { ...cached, cached: true };
    }

    const [usItems, globalItems] = await Promise.all([
      fetchRss(US_NEWS_RSS),
      getGlobalFeedItems(),
    ]);

    // Deduplicate, prioritizing US items first
    const seenUrls = new Set<string>();
    const allItems: RssItem[] = [];

    for (const item of [...usItems, ...globalItems]) {
      if (!seenUrls.has(item.link)) {
        seenUrls.add(item.link);
        allItems.push(item);
      }
    }

    // Sort by recency
    allItems.sort((a, b) => {
      const aTime = Date.parse(a.pubDate);
      const bTime = Date.parse(b.pubDate);
      return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
    });

    // Convert to trending articles
    let articles: TrendingArticle[] = allItems.map((item) => {
      const title = cleanHtml(item.title);
      const description = item.description ? cleanHtml(item.description) : null;
      const topics = extractTopicsFromContent({ title, description });

      return {
        id: articleId(item),
        title,
        source: item.source || "Unknown",
        url: item.link,
        publishedAt: item.pubDate
          ? new Date(item.pubDate).toISOString()
          : new Date().toISOString(),
        description,
        category: primaryCategory(topics),
      };
    });

    // Filter by category if requested
    if (category) {
      articles = articles.filter(
        (a) => a.category.toLowerCase() === category.toLowerCase()
      );
    }

    articles = articles.slice(0, MAX_ARTICLES);

    const response: TrendingResponseData = {
      articles,
      total: articles.length,
      updatedAt: new Date().toISOString(),
    };

    await this.cacheStore.setJson(cacheKey, response, TRENDING_CACHE_TTL_SECONDS);

    return { ...response, cached: false };
  }
}
