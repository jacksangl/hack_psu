import { createHash } from "node:crypto";

import { logger } from "../lib/logger";
import type { CacheStore } from "../lib/redis";
import type { AiProvider } from "../providers/aiProvider";
import { cleanHtml, fetchRss, type RssItem } from "../providers/rssScraperProvider";
import type { BiasComparisonData, BiasComparisonResponse, SourceCoverage } from "../types/biasComparison";
import { cacheKeys } from "../utils/cacheKeys";
import { dedup } from "../utils/inflight";
import type { BiasComparisonConfig } from "./biasComparisonConfig";
import { loadBiasComparisonConfig } from "./biasComparisonConfig";

const MIN_TOKEN_LENGTH = 4;
const MIN_SEARCH_TOKEN_LENGTH = 6;
const MAX_SEARCH_TERMS = 7;

function tokenizeTitle(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}-]*/gu) ?? [])
    .map((token) => token.replace(/^-+|-+$/g, ""))
    .filter((token) => token.length >= MIN_TOKEN_LENGTH);
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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

function extractSearchTerms(title: string): string[] {
  const namedEntities = (title.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g) ?? [])
    .map((entity) => `"${entity}"`);
  const numberTokens = title.match(/\b[\p{L}\p{N}-]*\d[\p{L}\p{N}-]*\b/gu) ?? [];
  const longTokens = tokenizeTitle(title)
    .filter((token) => token.length >= MIN_SEARCH_TOKEN_LENGTH)
    .sort((left, right) => right.length - left.length);

  return dedupeSignals([...namedEntities, ...numberTokens, ...longTokens], MAX_SEARCH_TERMS);
}

function extractEventSignals(title: string, maxSignals: number): string[] {
  const tokens = tokenizeTitle(title);
  const namedEntities = (title.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\b/g) ?? [])
    .map((entity) => titleCase(entity));
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

function significantWords(text: string): Set<string> {
  return new Set(tokenizeTitle(text));
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

function headlineSimilarity(titleA: string, titleB: string): number {
  const wordsA = significantWords(titleA);
  const wordsB = significantWords(titleB);

  if (wordsA.size === 0 || wordsB.size === 0) {
    return 0;
  }

  let overlap = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) {
      overlap++;
    }
  }

  return overlap / Math.min(wordsA.size, wordsB.size);
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
  const headlineScore = headlineSimilarity(referenceTitle, candidateTitle);
  const signalScore = overlapRatio(referenceSignals, candidateSignals);
  const numberScore = overlapRatio(
    extractNumberSignals(referenceTitle),
    extractNumberSignals(candidateTitle),
  );
  const timeScore = timeProximityScore(referenceTime, candidateTime, config.timeWindowHours);

  return (
    headlineScore * 0.40
    + signalScore * 0.30
    + numberScore * 0.20
    + timeScore * 0.10
  );
}

function filterByTimeProximity(items: RssItem[], timeWindowHours: number): RssItem[] {
  const withTime = items
    .map((item) => ({ item, time: Date.parse(item.pubDate) }))
    .filter(({ time }) => !Number.isNaN(time));

  if (withTime.length === 0) {
    return items;
  }

  const mostRecent = Math.max(...withTime.map(({ time }) => time));
  const cutoff = mostRecent - timeWindowHours * 60 * 60 * 1000;
  const filtered = withTime
    .filter(({ time }) => time >= cutoff)
    .map(({ item }) => item);

  return filtered.length > 0 ? filtered : items;
}

function urlHash(url: string): string {
  return createHash("sha1").update(url).digest("hex").slice(0, 16);
}

function normalizeSourceName(value: string): string {
  return value.trim().toLowerCase().replace(/^the\s+/, "").replace(/\s+/g, " ");
}

function sourceIdentity(source: string, url: string): string {
  const normalizedSource = normalizeSourceName(source);
  if (normalizedSource) {
    return `source:${normalizedSource}`;
  }

  return `host:${safeHostname(url)}`;
}

function buildFallbackComparison(
  params: { title: string; source: string },
  otherArticles: RssItem[],
  otherCoverages: SourceCoverage[],
  config: BiasComparisonConfig,
): BiasComparisonData {
  const keyTopics = dedupeSignals(extractEventSignals(params.title, config.maxSignals), 5);
  const sharedSignals = keyTopics.slice(0, 3);
  const sources = dedupeSignals(
    [params.source, ...otherCoverages.map((coverage) => coverage.source)],
    6,
  );
  const uniqueSources = sources.join(", ");

  const bulletSummary = dedupeSignals(
    [
      `${sources.length} outlets are covering the same event: ${uniqueSources}.`,
      sharedSignals.length > 0
        ? `Shared event markers across headlines include ${sharedSignals.join(", ")}.`
        : null,
      otherArticles[0]?.pubDate
        ? `Matched coverage is clustered within roughly ${config.timeWindowHours} hours to stay on the same incident.`
        : "Matched coverage is restricted to closely related headlines rather than broad topic overlap.",
      otherCoverages.length > 0
        ? "Coverage differences mostly come from what each outlet foregrounds in its headline and summary."
        : null,
    ],
    4,
  );

  const consensus = dedupeSignals(
    [
      sharedSignals.length > 0
        ? `Outlets consistently reference ${sharedSignals.join(", ")}.`
        : null,
      otherCoverages.length > 0
        ? "The core incident described in the original headline is present across the matched sources."
        : null,
      otherArticles.length > 0
        ? "Coverage falls inside the same short reporting window, indicating the same event cycle."
        : null,
    ],
    3,
  );

  const disagreements = dedupeSignals(
    [
      otherCoverages.length > 0
        ? "Headlines vary in which details they emphasize first, such as actors, location, or immediate consequences."
        : null,
      otherCoverages.length > 1
        ? "Some outlets add context or qualifiers that others leave out in their initial framing."
        : null,
    ],
    3,
  );

  const keyDifferences = dedupeSignals(
    [
      otherCoverages.length > 0
        ? `${otherCoverages[0].source} emphasizes "${otherCoverages[0].headline}".`
        : null,
      otherCoverages.length > 1
        ? `${otherCoverages[1].source} frames the event differently in its headline wording.`
        : null,
      otherCoverages.length > 2
        ? "Source selection changes which follow-on implications are highlighted."
        : null,
    ],
    3,
  );

  return {
    storyTitle: params.title,
    bulletSummary,
    originalSource: {
      source: params.source,
      headline: params.title,
      summary: bulletSummary[0] ?? "",
      url: "",
    },
    otherSources: otherCoverages,
    keyDifferences,
    keyTopics,
    consensus,
    disagreements,
    singleSource: otherCoverages.length === 0,
  };
}

function buildSingleSourceResponse(
  params: { title: string; source: string; url: string; description?: string | null },
): BiasComparisonData {
  return {
    storyTitle: params.title,
    bulletSummary: [],
    originalSource: {
      source: params.source,
      headline: params.title,
      summary:
        params.description?.trim()
        || "Only one distinct source was found for this story in the current search window.",
      url: params.url,
    },
    otherSources: [],
    keyDifferences: [],
    keyTopics: [],
    consensus: [],
    disagreements: [],
    singleSource: true,
  };
}

interface BiasComparisonServiceOptions {
  cacheStore: CacheStore;
  aiProvider: AiProvider;
  config?: BiasComparisonConfig;
}

export class BiasComparisonService {
  private readonly cacheStore: CacheStore;
  private readonly aiProvider: AiProvider;
  private readonly config: BiasComparisonConfig;

  constructor(options: BiasComparisonServiceOptions) {
    this.cacheStore = options.cacheStore;
    this.aiProvider = options.aiProvider;
    this.config = options.config ?? loadBiasComparisonConfig();
  }

  async compare(params: {
    title: string;
    source: string;
    url: string;
    description?: string | null;
    knownSources?: SourceCoverage[];
  }): Promise<BiasComparisonResponse> {
    const hash = urlHash(params.url);
    const cacheKey = cacheKeys.biasComparison(hash);

    return dedup(cacheKey, () => this.computeComparison(params, cacheKey));
  }

  private async computeComparison(
    params: { title: string; source: string; url: string; description?: string | null; knownSources?: SourceCoverage[] },
    cacheKey: string,
  ): Promise<BiasComparisonResponse> {
    const cached = await this.cacheStore.getJson<BiasComparisonData>(cacheKey);

    if (cached) {
      return { ...cached, cached: true };
    }

    let otherArticles: RssItem[] = [];
    let otherCoverages: SourceCoverage[];

    // If the frontend already found sources (from trending data), use them directly
    if (params.knownSources && params.knownSources.length > 0) {
      logger.info("bias comparison using known sources", {
        count: params.knownSources.length,
        originalSource: params.source,
      });
      otherCoverages = params.knownSources;
    } else {
      // Fall back to searching Google News RSS
      const keywords = extractSearchTerms(params.title).join(" ");
      logger.info("bias comparison search", {
        keywords,
        originalSource: params.source,
      });

      const searchUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(keywords)}&hl=en&gl=US&ceid=US:en`;
      const rawResults = await fetchRss(searchUrl);
      const timeFiltered = filterByTimeProximity(rawResults, this.config.timeWindowHours);
      const referenceTime = timeFiltered.reduce((latest, item) => {
        const parsed = Date.parse(item.pubDate);
        return Number.isNaN(parsed) ? latest : Math.max(latest, parsed);
      }, 0);

      const scoredMatches = timeFiltered
        .map((item) => {
          const candidateTitle = cleanHtml(item.title);
          const candidateTime = Date.parse(item.pubDate);
          return {
            item,
            score: eventMatchScore(
              params.title,
              candidateTitle,
              referenceTime,
              candidateTime,
              this.config,
            ),
            similarity: headlineSimilarity(params.title, candidateTitle),
          };
        })
        .filter(
          ({ similarity, score }) =>
            similarity >= this.config.minHeadlineSimilarity
            || score >= this.config.minEventMatchScore,
        )
        .sort((left, right) => right.score - left.score);

      const searchResults = scoredMatches.map(({ item }) => item);

      const originalIdentity = sourceIdentity(params.source, params.url);
      const seenSources = new Set<string>([originalIdentity]);

      for (const item of searchResults) {
        const identity = sourceIdentity(item.source || "", item.link);
        if (!seenSources.has(identity) && otherArticles.length < this.config.maxOtherSources) {
          seenSources.add(identity);
          otherArticles.push(item);
        }
      }

      otherCoverages = otherArticles.map((item) => ({
        source: item.source || "Unknown",
        headline: cleanHtml(item.title),
        summary: item.description ? cleanHtml(item.description) : "",
        url: item.link,
      }));
    }

    const originalCoverage: SourceCoverage = {
      source: params.source,
      headline: params.title,
      summary: "",
      url: params.url,
    };

    if (otherCoverages.length === 0) {
      const singleSourceResponse = buildSingleSourceResponse(params);
      await this.cacheStore.setJson(cacheKey, singleSourceResponse, this.config.cacheTtlSeconds);
      return { ...singleSourceResponse, cached: false };
    }

    const fallbackDraft = buildFallbackComparison(
      params,
      otherArticles,
      otherCoverages,
      this.config,
    );
    fallbackDraft.originalSource.url = params.url;
    originalCoverage.summary = fallbackDraft.originalSource.summary;

    try {
      const aiResult = await this.aiProvider.generateComparison({
        originalArticle: {
          source: params.source,
          headline: params.title,
          description: params.description ?? null,
        },
        otherSources: otherCoverages.map((coverage) => {
          const matchingArticle = otherArticles.find((article) => article.link === coverage.url);
          const description = matchingArticle?.description
            ? cleanHtml(matchingArticle.description)
            : coverage.summary || null;

          return {
            source: coverage.source,
            headline: coverage.headline,
            description,
          };
        }),
      });

      originalCoverage.summary =
        aiResult.originalSummary || fallbackDraft.originalSource.summary;

      for (let i = 0; i < otherCoverages.length; i++) {
        otherCoverages[i].summary =
          aiResult.sourceSummaries[i]
          ?? `Coverage from ${otherCoverages[i].source} centers on "${otherCoverages[i].headline}".`;
      }

      const response: BiasComparisonData = {
        storyTitle: aiResult.storyTitle || fallbackDraft.storyTitle,
        bulletSummary:
          aiResult.bulletSummary.length > 0
            ? aiResult.bulletSummary
            : fallbackDraft.bulletSummary,
        originalSource: originalCoverage,
        otherSources: otherCoverages,
        keyDifferences:
          aiResult.keyDifferences.length > 0
            ? aiResult.keyDifferences
            : fallbackDraft.keyDifferences,
        keyTopics:
          aiResult.keyTopics.length > 0
            ? aiResult.keyTopics
            : fallbackDraft.keyTopics,
        consensus:
          aiResult.consensus.length > 0
            ? aiResult.consensus
            : fallbackDraft.consensus,
        disagreements:
          aiResult.disagreements.length > 0
            ? aiResult.disagreements
            : fallbackDraft.disagreements,
        singleSource: false,
      };

      await this.cacheStore.setJson(cacheKey, response, this.config.cacheTtlSeconds);
      return { ...response, cached: false };
    } catch (error) {
      logger.warn("AI comparison failed, returning raw articles", {
        error: error instanceof Error ? error.message : "unknown",
      });
    }

    const fallback: BiasComparisonData = {
      storyTitle: fallbackDraft.storyTitle,
      bulletSummary: fallbackDraft.bulletSummary,
      originalSource: originalCoverage,
      otherSources: otherCoverages,
      keyDifferences: fallbackDraft.keyDifferences,
      keyTopics: fallbackDraft.keyTopics,
      consensus: fallbackDraft.consensus,
      disagreements: fallbackDraft.disagreements,
      singleSource: otherCoverages.length === 0,
    };

    await this.cacheStore.setJson(cacheKey, fallback, this.config.cacheTtlSeconds);
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
