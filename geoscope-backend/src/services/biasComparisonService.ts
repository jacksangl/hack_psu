import { createHash } from "node:crypto";

import { logger } from "../lib/logger";
import type { CacheStore } from "../lib/redis";
import type { AiProvider, GenerateComparisonParams } from "../providers/aiProvider";
import { fetchArticleContext } from "../providers/articleContextProvider";
import { cleanHtml, fetchRss, getGlobalFeedItems, type RssItem } from "../providers/rssScraperProvider";
import type {
  BiasComparisonData,
  BiasComparisonResponse,
  SourceBiasAnalysis,
  SourceCoverage,
} from "../types/biasComparison";
import { cacheKeys } from "../utils/cacheKeys";
import { dedup } from "../utils/inflight";
import { hasSeenSource, markSourceSeen } from "../utils/sourceIdentity";
import type { BiasComparisonConfig } from "./biasComparisonConfig";
import { loadBiasComparisonConfig } from "./biasComparisonConfig";

const MIN_TOKEN_LENGTH = 4;
const MIN_SEARCH_TOKEN_LENGTH = 6;
const MAX_SEARCH_TERMS = 7;
const MAX_PROPAGATED_QUERIES = 4;
const MAX_QUERY_SIGNAL_TERMS = 5;

type ComparisonArticleInput = GenerateComparisonParams["otherSources"][number];
type ComparisonOriginalArticleInput = GenerateComparisonParams["originalArticle"];

interface FramingBucketDefinition {
  detailLabel: string;
  toneLabel: string;
  patterns: RegExp[];
  priority: number;
}

interface FramingProfile {
  emphasizedDetails: string[];
  overallOpinion: string;
  toneLabel: string;
  leadEvidence: string | null;
}

const FRAMING_BUCKETS: FramingBucketDefinition[] = [
  {
    detailLabel: "police action and immediate public-safety risk",
    toneLabel: "security-first",
    patterns: [/\bpolice\b/i, /\barrest/i, /\bthwart/i, /\battack/i, /\bexplosive/i, /\bbomb/i, /\bsecurity\b/i],
    priority: 1,
  },
  {
    detailLabel: "the legal case and prosecutors' account",
    toneLabel: "legalistic",
    patterns: [/\baccused\b/i, /\bcharged\b/i, /\bprosecutor/i, /\bcourt\b/i, /\binvestigat/i, /\bterror/i, /\bsuspect\b/i],
    priority: 2,
  },
  {
    detailLabel: "victims and the immediate human toll",
    toneLabel: "human-impact-focused",
    patterns: [/\bkilled\b/i, /\binjured\b/i, /\bdead\b/i, /\bwounded\b/i, /\bvictim/i, /\bfamil/i, /\bsurviv/i],
    priority: 3,
  },
  {
    detailLabel: "official reaction and political consequences",
    toneLabel: "politically framed",
    patterns: [/\bpresident\b/i, /\bminister\b/i, /\bgovernment\b/i, /\bparliament\b/i, /\bpolicy\b/i, /\bofficials said\b/i],
    priority: 4,
  },
  {
    detailLabel: "demonstrators' motives and civil-liberties stakes",
    toneLabel: "movement-focused",
    patterns: [/\bprotest/i, /\bdemonstrat/i, /\bactivist/i, /\bmarch\b/i, /\bcivil liberties\b/i, /\braids?\b/i, /\brights?\b/i],
    priority: 5,
  },
  {
    detailLabel: "financial motives and commercial fallout",
    toneLabel: "economic-consequence-focused",
    patterns: [/\bmoney\b/i, /\bmarket/i, /\bbank\b/i, /\bheist/i, /\bretail/i, /\bhandbag/i, /\beuro\b/i, /\bfinancial\b/i],
    priority: 6,
  },
  {
    detailLabel: "the scale, spread, or repeated nature of the incident",
    toneLabel: "trend-oriented",
    patterns: [/\bmore than\b/i, /\bacross\b/i, /\bmultiple\b/i, /\bspate\b/i, /\bwave\b/i, /\bseries\b/i, /\bseveral\b/i],
    priority: 7,
  },
  {
    detailLabel: "rhetoric, symbolism, and how the story is being narrated",
    toneLabel: "interpretive",
    patterns: [/\bmeme/i, /\bnarrative/i, /\brhetoric/i, /\bsymbol/i, /\bimagery\b/i, /\bframing\b/i, /\bportray/i],
    priority: 8,
  },
];

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

function formatSignalList(values: string[]): string {
  if (values.length === 0) {
    return "";
  }

  if (values.length === 1) {
    return values[0];
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function stripTrailingPunctuation(value: string): string {
  return value.trim().replace(/[.!?]+$/g, "");
}

function lowercaseFirstCharacter(value: string): string {
  return value ? value.charAt(0).toLowerCase() + value.slice(1) : value;
}

function normalizeSentence(value: string): string {
  return stripTrailingPunctuation(value).toLowerCase();
}

function indefiniteArticle(value: string): "a" | "an" {
  return /^[aeiou]/i.test(value.trim()) ? "an" : "a";
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

function buildSearchQueries(title: string, config: BiasComparisonConfig): string[] {
  const normalizedTitle = cleanHtml(title).replace(/\s+/g, " ").trim();
  const coreTokens = tokenizeTitle(title);
  const keywordQuery = extractSearchTerms(title).join(" ");
  const leadTokenQuery = coreTokens.slice(0, MAX_QUERY_SIGNAL_TERMS).join(" ");
  const entityFocusedQuery = dedupeSignals(
    [
      ...(title.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g) ?? []).map((entity) => `"${entity.trim()}"`),
      ...extractNumberSignals(title),
      ...coreTokens.sort((left, right) => right.length - left.length),
    ],
    MAX_QUERY_SIGNAL_TERMS,
  ).join(" ");

  return dedupeSignals(
    [
      normalizedTitle,
      keywordQuery,
      leadTokenQuery,
      entityFocusedQuery,
    ],
    MAX_PROPAGATED_QUERIES,
  );
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

function dedupeItemsByUrl(items: RssItem[]): RssItem[] {
  const seenUrls = new Set<string>();
  const deduped: RssItem[] = [];

  for (const item of items) {
    if (!item.link || seenUrls.has(item.link)) {
      continue;
    }

    seenUrls.add(item.link);
    deduped.push(item);
  }

  return deduped;
}

function urlHash(url: string): string {
  return createHash("sha1").update(url).digest("hex").slice(0, 16);
}

function emptyBiasAnalysis(): SourceBiasAnalysis {
  return {
    emphasizedDetails: [],
    overallOpinion: "",
  };
}

function hasBiasAnalysis(analysis: SourceBiasAnalysis | null | undefined): analysis is SourceBiasAnalysis {
  return Boolean(
    analysis
    && (
      analysis.emphasizedDetails.length > 0
      || analysis.overallOpinion.trim()
    ),
  );
}

function toCoverage(item: RssItem): SourceCoverage {
  return {
    source: item.source || "Unknown",
    headline: cleanHtml(item.title),
    summary: item.description ? cleanHtml(item.description) : "",
    url: item.link,
    detectedBias: emptyBiasAnalysis(),
  };
}

function normalizeCoverage(coverage: SourceCoverage): SourceCoverage | null {
  const source = coverage.source?.trim() || "Unknown";
  const headline = coverage.headline?.trim();
  const url = coverage.url?.trim();

  if (!headline || !url) {
    return null;
  }

  return {
    source,
    headline,
    summary: coverage.summary?.trim() ?? "",
    url,
    detectedBias: coverage.detectedBias ?? emptyBiasAnalysis(),
  };
}

function articleText(article: {
  headline: string;
  description?: string | null;
  evidence?: string[];
  summary?: string | null;
}): string {
  return [article.headline, article.description ?? "", article.summary ?? "", ...(article.evidence ?? [])]
    .filter(Boolean)
    .join(" ");
}

function buildEvidenceDescription(description: string | null | undefined, evidence: string[]): string | null {
  const cleanedDescription = description?.trim() ?? "";
  const cleanedEvidence = dedupeSignals(evidence, 3);

  if (cleanedEvidence.length === 0) {
    return cleanedDescription || null;
  }

  const evidenceBlock = cleanedEvidence.map((detail) => `- ${detail}`).join("\n");

  if (cleanedDescription) {
    return `${cleanedDescription}\nEvidence:\n${evidenceBlock}`;
  }

  return `Evidence:\n${evidenceBlock}`;
}

function scoreFramingBucket(bucket: FramingBucketDefinition, text: string, leadEvidence: string | null): number {
  let score = bucket.patterns.reduce((total, pattern) => total + (pattern.test(text) ? 1 : 0), 0);

  if (leadEvidence) {
    score += bucket.patterns.reduce((total, pattern) => total + (pattern.test(leadEvidence) ? 1 : 0), 0);
  }

  return score;
}

function buildFramingProfile(article: {
  headline: string;
  description?: string | null;
  evidence?: string[];
  summary?: string | null;
}): FramingProfile {
  const leadEvidence = dedupeSignals(
    [...(article.evidence ?? []), article.summary, article.description],
    1,
  )[0] ?? null;
  const text = articleText(article);
  const rankedBuckets = FRAMING_BUCKETS
    .map((bucket) => ({
      bucket,
      score: scoreFramingBucket(bucket, text, leadEvidence),
    }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.bucket.priority - right.bucket.priority)
    .slice(0, 2)
    .map(({ bucket }) => bucket);

  const emphasizedDetails = rankedBuckets.length > 0
    ? dedupeSignals(rankedBuckets.map((bucket) => bucket.detailLabel), 3)
    : dedupeSignals(
      [
        ...extractEventSignals(text, 4),
        article.headline.split(/[:,-]/)[0]?.trim() ?? null,
        leadEvidence,
      ],
      3,
    );

  const toneLabel = rankedBuckets.length > 0
    ? formatSignalList(rankedBuckets.map((bucket) => bucket.toneLabel))
    : "matter-of-fact";

  let overallOpinion = rankedBuckets.length > 0
    ? `This source adopts ${indefiniteArticle(toneLabel)} ${toneLabel} tone, foregrounding ${formatSignalList(emphasizedDetails)}.`
    : leadEvidence?.trim()
      ? `This source stays largely matter-of-fact, using ${lowercaseFirstCharacter(stripTrailingPunctuation(leadEvidence))} to anchor the story.`
      : `This source centers its coverage on "${article.headline}".`;

  if (
    leadEvidence
    && normalizeSentence(leadEvidence) !== normalizeSentence(overallOpinion)
    && !normalizeSentence(overallOpinion).includes(normalizeSentence(leadEvidence))
  ) {
    overallOpinion = `${overallOpinion} It leans on ${lowercaseFirstCharacter(stripTrailingPunctuation(leadEvidence))}.`;
  }

  return {
    emphasizedDetails,
    overallOpinion,
    toneLabel,
    leadEvidence,
  };
}

function buildFallbackSourceSummary(article: {
  source: string;
  headline: string;
  description?: string | null;
  evidence?: string[];
}): string {
  const profile = buildFramingProfile(article);
  const lead = dedupeSignals([profile.leadEvidence, ...(article.evidence ?? []), article.description], 1)[0];

  if (lead) {
    return lead;
  }

  if (profile.overallOpinion) {
    return profile.overallOpinion;
  }

  return `Coverage from ${article.source} centers on "${article.headline}".`;
}

function buildDifferencePoint(
  referenceArticle: { source: string; headline: string; description?: string | null; evidence?: string[] },
  comparisonArticle: { source: string; headline: string; description?: string | null; evidence?: string[] },
): string | null {
  const referenceProfile = buildFramingProfile(referenceArticle);
  const comparisonProfile = buildFramingProfile(comparisonArticle);
  const referenceDetails = formatSignalList(referenceProfile.emphasizedDetails);
  const comparisonDetails = formatSignalList(comparisonProfile.emphasizedDetails);
  const tonesDiffer = normalizeSentence(referenceProfile.toneLabel) !== normalizeSentence(comparisonProfile.toneLabel);
  const detailsDiffer = normalizeSentence(referenceDetails) !== normalizeSentence(comparisonDetails);

  if (tonesDiffer && detailsDiffer) {
    return `${comparisonArticle.source} gives the story a ${comparisonProfile.toneLabel} tone by foregrounding ${comparisonDetails}, while ${referenceArticle.source} is more ${referenceProfile.toneLabel} and centers ${referenceDetails}.`;
  }

  if (detailsDiffer) {
    return `${comparisonArticle.source} foregrounds ${comparisonDetails}, which makes its coverage feel more ${comparisonProfile.toneLabel}; ${referenceArticle.source} instead centers ${referenceDetails}.`;
  }

  if (comparisonProfile.leadEvidence && referenceProfile.leadEvidence) {
    return `${comparisonArticle.source} leans on ${lowercaseFirstCharacter(stripTrailingPunctuation(comparisonProfile.leadEvidence))}, while ${referenceArticle.source} leans on ${lowercaseFirstCharacter(stripTrailingPunctuation(referenceProfile.leadEvidence))}.`;
  }

  return comparisonProfile.overallOpinion;
}

function fallbackBiasAnalysis(coverage: Pick<SourceCoverage, "headline" | "summary"> & { evidence?: string[] }): SourceBiasAnalysis {
  const profile = buildFramingProfile(coverage);

  return {
    emphasizedDetails: profile.emphasizedDetails,
    overallOpinion: profile.overallOpinion,
  };
}

function ensureDetectedBias(coverage: SourceCoverage): SourceCoverage {
  const normalized = normalizeCoverage(coverage);

  if (!normalized) {
    return {
      ...coverage,
      detectedBias: hasBiasAnalysis(coverage.detectedBias)
        ? coverage.detectedBias
        : fallbackBiasAnalysis({
          headline: coverage.headline ?? "",
          summary: coverage.summary ?? "",
        }),
    };
  }

  return {
    ...normalized,
    detectedBias: hasBiasAnalysis(normalized.detectedBias)
      ? {
        emphasizedDetails: dedupeSignals(normalized.detectedBias.emphasizedDetails, 4),
        overallOpinion: normalized.detectedBias.overallOpinion.trim(),
      }
      : fallbackBiasAnalysis(normalized),
  };
}

function ensureDetectedBiasInResponse(data: BiasComparisonData): BiasComparisonData {
  return {
    ...data,
    originalSource: ensureDetectedBias(data.originalSource),
    otherSources: data.otherSources.map((coverage) => ensureDetectedBias(coverage)),
  };
}

function dedupeCoverages(
  coverages: SourceCoverage[],
  originalSource: string,
  originalUrl: string,
  limit: number,
): SourceCoverage[] {
  const seenSources = new Set<string>();
  markSourceSeen(seenSources, originalSource, originalUrl);
  const deduped: SourceCoverage[] = [];

  for (const coverage of coverages) {
    const normalized = normalizeCoverage(coverage);
    if (!normalized) {
      continue;
    }

    if (hasSeenSource(seenSources, normalized.source, normalized.url)) {
      continue;
    }

    markSourceSeen(seenSources, normalized.source, normalized.url);
    deduped.push(normalized);

    if (deduped.length >= limit) {
      break;
    }
  }

  return deduped;
}

function mayBeSameStory(
  referenceTitle: string,
  candidateTitle: string,
  config: BiasComparisonConfig,
): boolean {
  const similarity = headlineSimilarity(referenceTitle, candidateTitle);
  const signalOverlap = overlapRatio(
    extractEventSignals(referenceTitle, config.maxSignals),
    extractEventSignals(candidateTitle, config.maxSignals),
  );
  const numberOverlap = overlapRatio(
    extractNumberSignals(referenceTitle),
    extractNumberSignals(candidateTitle),
  );

  return (
    similarity >= Math.max(0.18, config.minHeadlineSimilarity * 0.5)
    || signalOverlap >= 0.34
    || numberOverlap > 0
  );
}

function buildFallbackComparison(
  params: { title: string; source: string },
  originalArticle: ComparisonOriginalArticleInput,
  otherArticles: ComparisonArticleInput[],
  otherCoverages: SourceCoverage[],
  config: BiasComparisonConfig,
): BiasComparisonData {
  const combinedArticleText = [
    articleText(originalArticle),
    ...otherArticles.map((article) => articleText(article)),
  ].join(" ");
  const keyTopics = dedupeSignals(extractEventSignals(combinedArticleText, config.maxSignals + 2), 5);
  const sharedSignals = keyTopics.slice(0, 3);
  const differencePoints = dedupeSignals(
    otherArticles.map((article) => buildDifferencePoint(originalArticle, article)),
    4,
  );
  const bulletSummary = dedupeSignals(
    [
      sharedSignals.length > 0
        ? `Across the matched reporting, the story centers ${formatSignalList(sharedSignals)}.`
        : null,
      buildFallbackSourceSummary(originalArticle),
      ...differencePoints,
    ],
    4,
  );

  const consensus = dedupeSignals(
    [
      sharedSignals.length > 0
        ? `Multiple sources consistently reference ${formatSignalList(sharedSignals)}.`
        : null,
      dedupeSignals(
        otherArticles.flatMap((article) => article.evidence ?? []),
        1,
      )[0],
    ],
    3,
  );

  const disagreements = dedupeSignals(differencePoints, 3);

  const keyDifferences = dedupeSignals(
    [
      ...differencePoints,
      ...otherArticles.map((article) => {
        const leadSummary = buildFallbackSourceSummary(article).replace(/[.!?]+$/g, "");
        return leadSummary ? `${article.source} foregrounds ${leadSummary}.` : null;
      }),
    ],
    4,
  );

  return {
    storyTitle: params.title,
    bulletSummary,
    originalSource: {
      source: params.source,
      headline: params.title,
      summary: buildFallbackSourceSummary(originalArticle),
      url: "",
      detectedBias: fallbackBiasAnalysis({
        headline: params.title,
        summary: buildFallbackSourceSummary(originalArticle),
        evidence: originalArticle.evidence,
      }),
    },
    otherSources: otherCoverages.map((coverage, index) => ({
      ...coverage,
      summary: buildFallbackSourceSummary(otherArticles[index] ?? coverage),
      detectedBias:
        coverage.detectedBias && (
          coverage.detectedBias.emphasizedDetails.length > 0
          || coverage.detectedBias.overallOpinion.trim()
        )
          ? coverage.detectedBias
          : fallbackBiasAnalysis({
            ...coverage,
            summary: buildFallbackSourceSummary(otherArticles[index] ?? coverage),
            evidence: otherArticles[index]?.evidence ?? [],
          }),
    })),
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
      detectedBias: fallbackBiasAnalysis({
        headline: params.title,
        summary:
          params.description?.trim()
          || "Only one distinct source was found for this story in the current search window.",
      }),
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

  private async searchMatchingArticles(
    params: { title: string; source: string; url: string },
  ): Promise<RssItem[]> {
    const queries = buildSearchQueries(params.title, this.config);

    logger.info("bias comparison search propagation", {
      queries,
      originalSource: params.source,
    });

    const [queryResults, globalFeedItems] = await Promise.all([
      Promise.all(
        queries.map((query) =>
          fetchRss(`https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en&gl=US&ceid=US:en`),
        ),
      ),
      getGlobalFeedItems(),
    ]);

    const searchResults = dedupeItemsByUrl(queryResults.flat());
    const globalMatches = globalFeedItems.filter((item) =>
      mayBeSameStory(params.title, cleanHtml(item.title), this.config),
    );
    const candidatePool = dedupeItemsByUrl([...searchResults, ...globalMatches]);
    const timeFiltered = filterByTimeProximity(candidatePool, this.config.timeWindowHours);
    const referencePool = filterByTimeProximity(
      searchResults.length > 0 ? searchResults : candidatePool,
      this.config.timeWindowHours,
    );
    const referenceTime = referencePool.reduce((latest, item) => {
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

    const seenSources = new Set<string>();
    markSourceSeen(seenSources, params.source, params.url);
    const matchedArticles: RssItem[] = [];

    for (const { item } of scoredMatches) {
      if (hasSeenSource(seenSources, item.source || "", item.link)) {
        continue;
      }

      markSourceSeen(seenSources, item.source || "", item.link);
      matchedArticles.push(item);

      if (matchedArticles.length >= this.config.maxOtherSources) {
        break;
      }
    }

    return matchedArticles;
  }

  private async buildComparisonArticleInput(params: {
    source: string;
    headline: string;
    url: string;
    description?: string | null;
    embedEvidenceInDescription?: boolean;
  }): Promise<ComparisonArticleInput> {
    const baseDescription = params.description?.trim() ?? null;
    const context = await fetchArticleContext(params.url, baseDescription);
    const evidence = dedupeSignals(
      [...context.evidence, context.summary, baseDescription],
      4,
    );
    const description = params.embedEvidenceInDescription
      ? buildEvidenceDescription(baseDescription ?? context.summary ?? null, evidence)
      : baseDescription ?? context.summary ?? null;

    return {
      source: params.source,
      headline: params.headline,
      description,
      evidence,
    };
  }

  private async buildComparisonInputs(
    params: { title: string; source: string; url: string; description?: string | null },
    otherCoverages: SourceCoverage[],
    otherArticles: RssItem[],
  ): Promise<{
    originalArticle: ComparisonOriginalArticleInput;
    otherSources: ComparisonArticleInput[];
  }> {
    const originalArticlePromise = this.buildComparisonArticleInput({
      source: params.source,
      headline: params.title,
      url: params.url,
      description: params.description ?? null,
      embedEvidenceInDescription: true,
    });

    const otherSourcePromises = otherCoverages.map((coverage) => {
      const matchingArticle = otherArticles.find((article) => article.link === coverage.url);
      const description = matchingArticle?.description
        ? cleanHtml(matchingArticle.description)
        : coverage.summary || null;

      return this.buildComparisonArticleInput({
        source: coverage.source,
        headline: coverage.headline,
        url: coverage.url,
        description,
      });
    });

    const [originalArticle, otherSources] = await Promise.all([
      originalArticlePromise,
      Promise.all(otherSourcePromises),
    ]);

    return {
      originalArticle,
      otherSources,
    };
  }

  private async computeComparison(
    params: { title: string; source: string; url: string; description?: string | null; knownSources?: SourceCoverage[] },
    cacheKey: string,
  ): Promise<BiasComparisonResponse> {
    const cached = await this.cacheStore.getJson<BiasComparisonData>(cacheKey);

    if (cached) {
      return { ...ensureDetectedBiasInResponse(cached), cached: true };
    }

    const seededCoverages = dedupeCoverages(
      params.knownSources ?? [],
      params.source,
      params.url,
      this.config.maxOtherSources,
    );

    if (seededCoverages.length > 0) {
      logger.info("bias comparison using seeded sources", {
        count: seededCoverages.length,
        originalSource: params.source,
      });
    }

    const searchResults = seededCoverages.length < this.config.maxOtherSources
      ? await this.searchMatchingArticles(params)
      : [];

    const seenSources = new Set<string>();
    markSourceSeen(seenSources, params.source, params.url);
    for (const coverage of seededCoverages) {
      markSourceSeen(seenSources, coverage.source, coverage.url);
    }

    const otherCoverages = [...seededCoverages];
    const otherArticles: RssItem[] = [];

    for (const item of searchResults) {
      const coverage = toCoverage(item);
      if (hasSeenSource(seenSources, coverage.source, coverage.url)) {
        continue;
      }

      markSourceSeen(seenSources, coverage.source, coverage.url);
      otherCoverages.push(coverage);
      otherArticles.push(item);

      if (otherCoverages.length >= this.config.maxOtherSources) {
        break;
      }
    }

    const originalCoverage: SourceCoverage = {
      source: params.source,
      headline: params.title,
      summary: "",
      url: params.url,
      detectedBias: emptyBiasAnalysis(),
    };

    if (otherCoverages.length === 0) {
      const singleSourceResponse = buildSingleSourceResponse(params);
      await this.cacheStore.setJson(cacheKey, singleSourceResponse, this.config.cacheTtlSeconds);
      return { ...singleSourceResponse, cached: false };
    }

    const comparisonInputs = await this.buildComparisonInputs(
      params,
      otherCoverages,
      otherArticles,
    );

    const fallbackDraft = buildFallbackComparison(
      params,
      comparisonInputs.originalArticle,
      comparisonInputs.otherSources,
      otherCoverages,
      this.config,
    );
    fallbackDraft.originalSource.url = params.url;
    originalCoverage.summary = fallbackDraft.originalSource.summary;
    originalCoverage.detectedBias =
      fallbackDraft.originalSource.detectedBias
      ?? fallbackBiasAnalysis({
        ...originalCoverage,
        evidence: comparisonInputs.originalArticle.evidence,
      });

    for (let i = 0; i < otherCoverages.length; i++) {
      otherCoverages[i].summary =
        fallbackDraft.otherSources[i]?.summary
        ?? buildFallbackSourceSummary(comparisonInputs.otherSources[i] ?? otherCoverages[i]);
      otherCoverages[i].detectedBias =
        fallbackDraft.otherSources[i]?.detectedBias
        ?? fallbackBiasAnalysis({
          ...otherCoverages[i],
          evidence: comparisonInputs.otherSources[i]?.evidence ?? [],
        });
    }

    try {
      const aiResult = await this.aiProvider.generateComparison(comparisonInputs);

      originalCoverage.summary =
        aiResult.originalSummary || fallbackDraft.originalSource.summary;
      originalCoverage.detectedBias =
        aiResult.originalBias.emphasizedDetails.length > 0 || aiResult.originalBias.overallOpinion.trim()
          ? aiResult.originalBias
          : fallbackDraft.originalSource.detectedBias ?? fallbackBiasAnalysis({
            ...originalCoverage,
            evidence: comparisonInputs.originalArticle.evidence,
          });

      for (let i = 0; i < otherCoverages.length; i++) {
        otherCoverages[i].summary =
          aiResult.sourceSummaries[i]
          ?? fallbackDraft.otherSources[i]?.summary
          ?? buildFallbackSourceSummary(comparisonInputs.otherSources[i] ?? otherCoverages[i]);
        otherCoverages[i].detectedBias =
          aiResult.sourceBiases[i] && (
            aiResult.sourceBiases[i].emphasizedDetails.length > 0
            || aiResult.sourceBiases[i].overallOpinion.trim()
          )
            ? aiResult.sourceBiases[i]
            : fallbackDraft.otherSources[i]?.detectedBias
              ?? fallbackBiasAnalysis({
                ...otherCoverages[i],
                evidence: comparisonInputs.otherSources[i]?.evidence ?? [],
              });
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
