import type { NewsResponse, SentimentEntry } from "../types";

export interface CountryHeatEntry {
  heat: number;
  articleCount: number;
  sourceCount: number;
  hasNews: boolean;
}

export type CountryHeatData = Record<string, CountryHeatEntry>;

export function buildCountryHeatData(
  countryNews: Record<string, NewsResponse>
): CountryHeatData {
  let maxArticles = 0;
  const countryHeat: CountryHeatData = {};

  for (const [countryCode, newsData] of Object.entries(countryNews)) {
    const hasNews = newsData.articles.length > 0;
    const articleCount = newsData.articles.length;
    const sources = new Set(newsData.articles.map((article) => article.source));
    const sourceCount = sources.size;
    if (hasNews) {
      maxArticles = Math.max(maxArticles, articleCount);
    }
    countryHeat[countryCode] = { articleCount, sourceCount, heat: 0, hasNews };
  }

  for (const data of Object.values(countryHeat)) {
    const normalized = maxArticles > 0 ? data.articleCount / maxArticles : 0;
    data.heat = normalized > 0 ? Math.pow(normalized, 1.4) : 0;
  }

  return countryHeat;
}

export function buildCountryVisualHeatData(
  globalSentiment: Record<string, SentimentEntry>,
  countryNews: Record<string, NewsResponse>
): CountryHeatData {
  const newsHeat = buildCountryHeatData(countryNews);
  const visualHeat: CountryHeatData = {};

  const sentimentEntries = Object.entries(globalSentiment);
  const maxArticleCount = sentimentEntries.reduce(
    (max, [, entry]) => Math.max(max, entry.articleCount ?? 0),
    1
  );

  for (const [countryCode, entry] of sentimentEntries) {
    const volumeHeat = maxArticleCount > 0 ? (entry.articleCount ?? 0) / maxArticleCount : 0;

    visualHeat[countryCode] = newsHeat[countryCode] ?? {
      heat: volumeHeat > 0 ? Math.pow(volumeHeat, 1.4) : 0,
      articleCount: entry.articleCount ?? 0,
      sourceCount: 0,
      hasNews: (entry.articleCount ?? 0) > 0,
    };
  }

  for (const [countryCode, entry] of Object.entries(newsHeat)) {
    if (!visualHeat[countryCode]) {
      visualHeat[countryCode] = entry;
    }
  }

  return visualHeat;
}
