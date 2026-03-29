import type { NewsResponse, SentimentEntry } from "../types";

export interface CountryHeatEntry {
  heat: number;
  sourceCount: number;
  hasNews: boolean;
}

export type CountryHeatData = Record<string, CountryHeatEntry>;

export function buildCountryHeatData(
  countryNews: Record<string, NewsResponse>
): CountryHeatData {
  let maxSources = 0;
  const countryHeat: CountryHeatData = {};

  for (const [countryCode, newsData] of Object.entries(countryNews)) {
    const hasNews = newsData.articles.length > 0;
    const sources = new Set(newsData.articles.map((article) => article.source));
    const sourceCount = sources.size;
    if (hasNews) {
      maxSources = Math.max(maxSources, sourceCount);
    }
    countryHeat[countryCode] = { sourceCount, heat: 0, hasNews };
  }

  for (const data of Object.values(countryHeat)) {
    data.heat = maxSources > 0 ? data.sourceCount / maxSources : 0;
  }

  return countryHeat;
}

export function buildCountryVisualHeatData(
  globalSentiment: Record<string, SentimentEntry>,
  countryNews: Record<string, NewsResponse>
): CountryHeatData {
  const newsHeat = buildCountryHeatData(countryNews);
  const visualHeat: CountryHeatData = {};
  const maxSentimentMagnitude = Object.values(globalSentiment).reduce(
    (maxValue, entry) => Math.max(maxValue, Math.abs(entry.sentimentScore)),
    0
  );

  for (const [countryCode, entry] of Object.entries(globalSentiment)) {
    const fallbackHeat =
      maxSentimentMagnitude > 0
        ? Math.abs(entry.sentimentScore) / maxSentimentMagnitude
        : 0;

    visualHeat[countryCode] = newsHeat[countryCode] ?? {
      heat: fallbackHeat,
      sourceCount: 0,
      hasNews: false,
    };
  }

  for (const [countryCode, entry] of Object.entries(newsHeat)) {
    if (!visualHeat[countryCode]) {
      visualHeat[countryCode] = entry;
    }
  }

  return visualHeat;
}
