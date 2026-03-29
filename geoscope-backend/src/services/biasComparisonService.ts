import { createHash } from "node:crypto";

import { logger } from "../lib/logger";
import type { CacheStore } from "../lib/redis";
import { fetchRss, cleanHtml, type RssItem } from "../providers/rssScraperProvider";
import type { AiProvider } from "../providers/aiProvider";
import type { BiasComparisonData, BiasComparisonResponse, SourceCoverage } from "../types/biasComparison";
import { cacheKeys } from "../utils/cacheKeys";

const BIAS_CACHE_TTL_SECONDS = 30 * 60;
const MAX_OTHER_SOURCES = 5;

const STOP_WORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "shall", "can", "to", "of", "in", "for",
  "on", "with", "at", "by", "from", "as", "into", "through", "during",
  "before", "after", "above", "below", "between", "out", "off", "over",
  "under", "again", "further", "then", "once", "here", "there", "when",
  "where", "why", "how", "all", "each", "every", "both", "few", "more",
  "most", "other", "some", "such", "no", "nor", "not", "only", "own",
  "same", "so", "than", "too", "very", "just", "because", "but", "and",
  "or", "if", "while", "about", "up", "its", "it", "this", "that",
  "these", "those", "he", "she", "they", "we", "you", "i", "me", "my",
  "his", "her", "our", "your", "their", "what", "which", "who", "whom",
  "says", "said", "new", "also", "amid",
]);

function extractKeywords(title: string): string {
  const words = title
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w.toLowerCase()));

  return words.slice(0, 5).join(" ");
}

function urlHash(url: string): string {
  return createHash("sha1").update(url).digest("hex").slice(0, 16);
}

interface BiasComparisonServiceOptions {
  cacheStore: CacheStore;
  aiProvider: AiProvider;
}

export class BiasComparisonService {
  private readonly cacheStore: CacheStore;
  private readonly aiProvider: AiProvider;

  constructor(options: BiasComparisonServiceOptions) {
    this.cacheStore = options.cacheStore;
    this.aiProvider = options.aiProvider;
  }

  async compare(params: {
    title: string;
    source: string;
    url: string;
  }): Promise<BiasComparisonResponse> {
    const hash = urlHash(params.url);
    const cacheKey = cacheKeys.biasComparison(hash);
    const cached = await this.cacheStore.getJson<BiasComparisonData>(cacheKey);

    if (cached) {
      return { ...cached, cached: true };
    }

    // Search for related articles from other sources
    const keywords = extractKeywords(params.title);
    logger.info("bias comparison search", { keywords, originalSource: params.source });

    const searchUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(keywords)}&hl=en&gl=US&ceid=US:en`;
    const searchResults = await fetchRss(searchUrl);

    // Filter out original source and deduplicate
    const originalHost = safeHostname(params.url);
    const seenHosts = new Set<string>([originalHost]);
    const otherArticles: RssItem[] = [];

    for (const item of searchResults) {
      const host = safeHostname(item.link);
      if (!seenHosts.has(host) && otherArticles.length < MAX_OTHER_SOURCES) {
        seenHosts.add(host);
        otherArticles.push(item);
      }
    }

    const originalCoverage: SourceCoverage = {
      source: params.source,
      headline: params.title,
      summary: "",
      url: params.url,
    };

    const otherCoverages: SourceCoverage[] = otherArticles.map((item) => ({
      source: item.source || "Unknown",
      headline: cleanHtml(item.title),
      summary: "",
      url: item.link,
    }));

    // Use AI to generate comparison
    if (otherCoverages.length > 0) {
      try {
        const aiResult = await this.aiProvider.generateComparison({
          originalTitle: params.title,
          originalSource: params.source,
          otherSources: otherCoverages.map((c) => ({
            source: c.source,
            headline: c.headline,
            description: otherArticles.find((a) => a.link === c.url)?.description ?? null,
          })),
        });

        // Fill in AI summaries
        originalCoverage.summary = aiResult.originalSummary;
        for (let i = 0; i < otherCoverages.length; i++) {
          otherCoverages[i].summary = aiResult.sourceSummaries[i] ?? "";
        }

        const response: BiasComparisonData = {
          storyTitle: aiResult.storyTitle,
          originalSource: originalCoverage,
          otherSources: otherCoverages,
          keyDifferences: aiResult.keyDifferences,
        };

        await this.cacheStore.setJson(cacheKey, response, BIAS_CACHE_TTL_SECONDS);
        return { ...response, cached: false };
      } catch (error) {
        logger.warn("AI comparison failed, returning raw articles", {
          error: error instanceof Error ? error.message : "unknown",
        });
      }
    }

    // Fallback: return without AI summaries
    const fallback: BiasComparisonData = {
      storyTitle: params.title,
      originalSource: originalCoverage,
      otherSources: otherCoverages,
      keyDifferences: [],
    };

    await this.cacheStore.setJson(cacheKey, fallback, BIAS_CACHE_TTL_SECONDS);
    return { ...fallback, cached: false };
  }
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}
