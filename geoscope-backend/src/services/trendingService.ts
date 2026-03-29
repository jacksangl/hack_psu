import { createHash } from "node:crypto";

import type { CacheStore } from "../lib/redis";
import { getGlobalFeedItems, fetchRss, cleanHtml, type RssItem } from "../providers/rssScraperProvider";
import type { SourceCoverage } from "../types/biasComparison";
import type { TrendingArticle, TrendingResponse, TrendingResponseData } from "../types/trending";
import type { BiasComparisonConfig } from "./biasComparisonConfig";
import { loadBiasComparisonConfig } from "./biasComparisonConfig";
import { extractTopicsFromContent } from "../utils/articleSignals";
import { cacheKeys } from "../utils/cacheKeys";
import { dedup } from "../utils/inflight";
import { hasSeenSource, markSourceSeen } from "../utils/sourceIdentity";

const TRENDING_CACHE_TTL_SECONDS = 10 * 60;
const MAX_ARTICLES = 30;

const US_NEWS_RSS = "https://news.google.com/rss?hl=en&gl=US&ceid=US:en";

interface TrendingServiceOptions {
  cacheStore: CacheStore;
  config?: BiasComparisonConfig;
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

function tokenizeTitle(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}-]*/gu) ?? [])
    .map((token) => token.replace(/^-+|-+$/g, ""))
    .filter((token) => token.length >= 4);
}

function dedupeSignals(values: Array<string | null | undefined>, limit: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed) {
      continue;
    }

    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(trimmed);

    if (result.length >= limit) {
      break;
    }
  }

  return result;
}

function extractEventSignals(title: string, maxSignals: number): string[] {
  const tokens = tokenizeTitle(title);
  const namedEntities = (title.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\b/g) ?? [])
    .map((entity) =>
      entity
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" "),
    );
  const numberTokens = title.match(/\b[\p{L}\p{N}-]*\d[\p{L}\p{N}-]*\b/gu) ?? [];
  const phrases = tokens.flatMap((_, index) => {
    const pair = tokens.slice(index, index + 2);
    const triple = tokens.slice(index, index + 3);
    return [
      pair.length === 2 ? pair.join(" ") : null,
      triple.length === 3 ? triple.join(" ") : null,
    ];
  });

  return dedupeSignals(
    [
      ...namedEntities,
      ...numberTokens,
      ...phrases,
      ...tokens.sort((left, right) => right.length - left.length),
    ],
    maxSignals,
  );
}

function extractNumberSignals(title: string): string[] {
  return dedupeSignals(title.match(/\b[\p{L}\p{N}-]*\d[\p{L}\p{N}-]*\b/gu) ?? [], 6);
}

function overlapRatio(valuesA: string[], valuesB: string[]): number {
  if (valuesA.length === 0 || valuesB.length === 0) {
    return 0;
  }

  const setB = new Set(valuesB.map((value) => value.toLowerCase()));
  let overlap = 0;
  for (const value of valuesA) {
    if (setB.has(value.toLowerCase())) {
      overlap++;
    }
  }

  return overlap / Math.min(valuesA.length, setB.size);
}

function timeProximityScore(
  referenceTime: number,
  candidateTime: number,
  timeWindowHours: number,
): number {
  if (Number.isNaN(referenceTime) || Number.isNaN(candidateTime)) {
    return 0.35;
  }

  const deltaHours = Math.abs(referenceTime - candidateTime) / (1000 * 60 * 60);
  if (deltaHours <= 6) return 1;
  if (deltaHours <= 24) return 0.8;
  if (deltaHours <= 48) return 0.6;
  if (deltaHours <= timeWindowHours) return 0.4;
  return 0.15;
}

function eventMatchScore(
  referenceTitle: string,
  candidateTitle: string,
  referenceTime: number,
  candidateTime: number,
  config: BiasComparisonConfig,
): number {
  const referenceSignals = extractEventSignals(referenceTitle, config.maxSignals);
  const candidateSignals = extractEventSignals(candidateTitle, config.maxSignals);
  const signalScore = overlapRatio(referenceSignals, candidateSignals);
  const numberScore = overlapRatio(
    extractNumberSignals(referenceTitle),
    extractNumberSignals(candidateTitle),
  );
  const timeScore = timeProximityScore(referenceTime, candidateTime, config.timeWindowHours);

  return (
    headlineSimilarity(referenceTitle, candidateTitle) * 0.40
    + signalScore * 0.30
    + numberScore * 0.20
    + timeScore * 0.10
  );
}

function storyText(item: RssItem): string {
  return cleanHtml([item.title, item.description ?? ""].filter(Boolean).join(" "));
}

function extractDistinctivePhrases(text: string): string[] {
  const normalized = cleanHtml(text);
  const quotedPhrases = [
    ...(normalized.match(/"([^"\n]{3,80})"/g) ?? []).map((phrase) => phrase.replace(/"/g, "")),
    ...(normalized.match(/'([^'\n]{3,80})'/g) ?? []).map((phrase) => phrase.replace(/'/g, "")),
  ];
  const capitalizedPhrases = normalized.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\b/g) ?? [];

  return dedupeSignals(
    [...quotedPhrases, ...capitalizedPhrases].map((phrase) => phrase.trim()),
    10,
  );
}

function phraseOverlapRatio(textA: string, textB: string): number {
  return overlapRatio(extractDistinctivePhrases(textA), extractDistinctivePhrases(textB));
}

function bestClusterTimeScore(
  cluster: RssItem[],
  candidate: RssItem,
  timeWindowHours: number,
): number {
  const candidateTime = Date.parse(candidate.pubDate);

  return cluster.reduce((best, item) => {
    const itemTime = Date.parse(item.pubDate);
    return Math.max(best, timeProximityScore(itemTime, candidateTime, timeWindowHours));
  }, 0);
}

function shouldJoinCluster(
  cluster: RssItem[],
  candidate: RssItem,
  config: BiasComparisonConfig,
): boolean {
  const candidateTitle = cleanHtml(candidate.title);
  const candidateText = storyText(candidate);
  const candidateTime = Date.parse(candidate.pubDate);
  const clusterText = cleanHtml(cluster.map((item) => storyText(item)).join(" "));
  const clusterSignalOverlap = overlapRatio(
    extractEventSignals(clusterText, config.maxSignals + 4),
    extractEventSignals(candidateText, config.maxSignals + 2),
  );
  const clusterPhraseOverlap = phraseOverlapRatio(clusterText, candidateText);

  let bestHeadlineSimilarity = 0;
  let bestTitleScore = 0;
  let bestTextSimilarity = 0;
  let bestTextScore = 0;
  let bestPhraseOverlap = clusterPhraseOverlap;

  for (const item of cluster) {
    const itemTitle = cleanHtml(item.title);
    const itemText = storyText(item);
    const itemTime = Date.parse(item.pubDate);

    bestHeadlineSimilarity = Math.max(
      bestHeadlineSimilarity,
      headlineSimilarity(itemTitle, candidateTitle),
    );
    bestTitleScore = Math.max(
      bestTitleScore,
      eventMatchScore(itemTitle, candidateTitle, itemTime, candidateTime, config),
    );
    bestTextSimilarity = Math.max(
      bestTextSimilarity,
      headlineSimilarity(itemText, candidateText),
    );
    bestTextScore = Math.max(
      bestTextScore,
      eventMatchScore(itemText, candidateText, itemTime, candidateTime, config),
    );
    bestPhraseOverlap = Math.max(
      bestPhraseOverlap,
      phraseOverlapRatio(itemText, candidateText),
    );
  }

  const timeScore = bestClusterTimeScore(cluster, candidate, config.timeWindowHours);

  if (
    bestHeadlineSimilarity >= config.minHeadlineSimilarity
    || bestTitleScore >= config.minEventMatchScore
  ) {
    return true;
  }

  if (bestTextScore >= Math.max(0.42, config.minEventMatchScore - 0.05)) {
    return true;
  }

  if (bestPhraseOverlap > 0 && bestTextSimilarity >= 0.2 && timeScore >= 0.6) {
    return true;
  }

  return (
    clusterSignalOverlap >= 0.34
    && bestTextSimilarity >= 0.22
    && timeScore >= 0.6
  );
}

function toCoverage(item: RssItem): SourceCoverage {
  return {
    source: item.source || "Unknown",
    headline: cleanHtml(item.title),
    summary: item.description ? cleanHtml(item.description) : "",
    url: item.link,
  };
}

function groupItemsByStory(items: RssItem[], config: BiasComparisonConfig): RssItem[][] {
  const consumed = new Set<number>();
  const groups: RssItem[][] = [];

  for (let i = 0; i < items.length; i++) {
    if (consumed.has(i)) {
      continue;
    }

    const reference = items[i];
    const cluster: RssItem[] = [reference];
    consumed.add(i);

    let expanded = true;

    while (expanded) {
      expanded = false;

      for (let j = i + 1; j < items.length; j++) {
        if (consumed.has(j)) {
          continue;
        }

        const candidate = items[j];
        if (shouldJoinCluster(cluster, candidate, config)) {
          cluster.push(candidate);
          consumed.add(j);
          expanded = true;
        }
      }
    }

    groups.push(cluster);
  }

  return groups;
}

export class TrendingService {
  private readonly cacheStore: CacheStore;
  private readonly config: BiasComparisonConfig;

  constructor(options: TrendingServiceOptions) {
    this.cacheStore = options.cacheStore;
    this.config = options.config ?? loadBiasComparisonConfig();
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

    const groupedItems = groupItemsByStory(allItems, this.config);

    let articles: TrendingArticle[] = groupedItems.map((group) => {
      const leadItem = group[0];
      const title = cleanHtml(leadItem.title);
      const description = leadItem.description ? cleanHtml(leadItem.description) : null;
      const topics = extractTopicsFromContent({ title, description });
      const seenSources = new Set<string>();
      const distinctCoverage = group.filter((item) => {
        if (hasSeenSource(seenSources, item.source || "", item.link)) {
          return false;
        }

        markSourceSeen(seenSources, item.source || "", item.link);
        return true;
      });
      const otherSources = distinctCoverage.slice(1).map(toCoverage);

      return {
        id: articleId(leadItem),
        title,
        source: leadItem.source || "Unknown",
        url: leadItem.link,
        publishedAt: leadItem.pubDate
          ? new Date(leadItem.pubDate).toISOString()
          : new Date().toISOString(),
        description,
        imageUrl: leadItem.imageUrl,
        category: primaryCategory(topics),
        sourceCount: distinctCoverage.length,
        singleSource: otherSources.length === 0,
        otherSources,
      };
    });

    // Filter by category if requested
    if (category) {
      articles = articles.filter(
        (a) => a.category.toLowerCase() === category.toLowerCase()
      );
    }

    articles.sort((left, right) => {
      if (right.sourceCount !== left.sourceCount) {
        return right.sourceCount - left.sourceCount;
      }

      return new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime();
    });

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
