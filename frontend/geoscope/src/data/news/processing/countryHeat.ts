import type { NewsResponse, SentimentEntry } from "../types";

export interface CountryHeatEntry {
  heat: number;
  articleCount: number;
  sourceCount: number;
  hasNews: boolean;
}

export type CountryHeatData = Record<string, CountryHeatEntry>;

/**
 * Assign heat using percentile ranking so colors are evenly distributed
 * across the gradient regardless of how similar the raw values are.
 */
function assignPercentileHeat(data: CountryHeatData): void {
  const entries = Object.values(data).filter((e) => e.hasNews);
  if (entries.length === 0) return;

  // Sort by sourceCount first, then articleCount as tiebreaker
  entries.sort(
    (a, b) => a.sourceCount - b.sourceCount || a.articleCount - b.articleCount
  );

  const count = entries.length;
  for (let i = 0; i < count; i++) {
    // Spread from 0.05 to 1.0 based on rank
    entries[i].heat = count === 1 ? 0.5 : 0.05 + (i / (count - 1)) * 0.95;
  }
}

export function buildCountryHeatData(
  countryNews: Record<string, NewsResponse>
): CountryHeatData {
  const countryHeat: CountryHeatData = {};

  for (const [countryCode, newsData] of Object.entries(countryNews)) {
    const hasNews = newsData.articles.length > 0;
    const articleCount = newsData.articles.length;
    const sources = new Set(newsData.articles.map((article) => article.source));
    const sourceCount = sources.size;
    countryHeat[countryCode] = { articleCount, sourceCount, heat: 0, hasNews };
  }

  assignPercentileHeat(countryHeat);
  return countryHeat;
}

export function buildCountryVisualHeatData(
  globalSentiment: Record<string, SentimentEntry>,
  countryNews: Record<string, NewsResponse>
): CountryHeatData {
  const newsHeat = buildCountryHeatData(countryNews);
  const visualHeat: CountryHeatData = {};

  for (const [countryCode, entry] of Object.entries(globalSentiment)) {
    visualHeat[countryCode] = newsHeat[countryCode] ?? {
      heat: 0,
      articleCount: entry.articleCount ?? 0,
      sourceCount: 0,
      hasNews: true,  // present in globalSentiment = backend has data for it
    };
  }

  for (const [countryCode, entry] of Object.entries(newsHeat)) {
    if (!visualHeat[countryCode]) {
      visualHeat[countryCode] = entry;
    }
  }

  // Re-rank the full combined set so sentiment-only entries get proper heat too
  assignPercentileHeat(visualHeat);

  return visualHeat;
}
