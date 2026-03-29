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

function significantWords(text: string): Set<string> {
  return new Set(
    (text.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}-]*/gu) ?? [])
      .map((t) => t.replace(/^-+|-+$/g, ""))
      .filter((t) => t.length >= 4),
  );
}

function headlineSimilarity(a: string, b: string): number {
  const wordsA = significantWords(a);
  const wordsB = significantWords(b);
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let overlap = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) overlap++;
  }
  return overlap / Math.min(wordsA.size, wordsB.size);
}

/** Group articles by story similarity, counting distinct sources per group. */
function countSourcesPerArticle(articles: TrendingArticle[]): void {
  const SIMILARITY_THRESHOLD = 0.45;
  // For each article, count how many distinct sources cover a similar headline
  for (let i = 0; i < articles.length; i++) {
    const sources = new Set<string>([articles[i].source.toLowerCase()]);
    for (let j = 0; j < articles.length; j++) {
      if (i === j) continue;
      if (headlineSimilarity(articles[i].title, articles[j].title) >= SIMILARITY_THRESHOLD) {
        sources.add(articles[j].source.toLowerCase());
      }
    }
    articles[i].sourceCount = sources.size;
  }
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
        imageUrl: item.imageUrl,
        category: primaryCategory(topics),
        sourceCount: 1,
      };
    });

    // Filter by category if requested
    if (category) {
      articles = articles.filter(
        (a) => a.category.toLowerCase() === category.toLowerCase()
      );
    }

    // Count how many distinct sources cover each story
    countSourcesPerArticle(articles);

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
