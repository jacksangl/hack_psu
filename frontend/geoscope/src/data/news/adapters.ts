import type { Sentiment } from "../../utils/sentimentColors";
import type {
  BriefResponse,
  NewsCategory,
  NewsResponse,
  SentimentResponse,
} from "./types";

function labelToSentiment(label: string, score?: number): Sentiment {
  if (score != null && score <= -0.5) return "crisis";
  if (label === "positive") return "positive";
  if (label === "negative") return "negative";
  return "neutral";
}

function labelToScore(label: string): number {
  if (label === "positive") return 0.3;
  if (label === "negative") return -0.3;
  return 0;
}

const TOPIC_TO_CATEGORY: Record<string, NewsCategory> = {
  politics: "politics",
  conflict: "conflict",
  economy: "economy",
  business: "business",
  climate: "climate",
  health: "health",
  technology: "technology",
  sports: "sports",
  culture: "culture",
  diplomacy: "diplomacy",
};

function topicsToCategory(topics?: string[]): NewsCategory {
  if (!topics || topics.length === 0) return "politics";
  const first = topics[0].toLowerCase();
  return TOPIC_TO_CATEGORY[first] ?? "politics";
}

// Temporary frontend adapters while the backend is still rolling out UI-ready
// response shapes. Once the backend emits the final contract directly, this file
// should become a thin passthrough or be removed.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function adaptCountryNewsResponse(raw: any): NewsResponse {
  return {
    countryCode: raw.countryCode,
    countryName: raw.countryName,
    articles: (raw.articles ?? []).map((article: any) => ({
      id: article.id,
      title: article.title,
      source: article.source,
      publishedAt: article.publishedAt,
      url: article.url,
      lat: article.latitude ?? 0,
      lng: article.longitude ?? 0,
      sentiment: labelToSentiment(
        article.sentiment?.label ?? "neutral",
        article.sentiment?.score
      ),
      relatedCountries: article.relatedCountries ?? [],
      category: topicsToCategory(article.topics),
    })),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function adaptCountryBriefResponse(raw: any): BriefResponse {
  const label: string = raw.sentiment ?? "neutral";

  return {
    countryCode: raw.countryCode,
    summary: raw.summary,
    sentiment: labelToSentiment(label),
    sentimentScore: raw.sentimentScore ?? labelToScore(label),
    keyActors: raw.keyActors ?? [],
    topicTags: raw.topicTags ?? [],
    articleCount: raw.articleCount ?? 0,
    lastUpdated: raw.lastUpdated ?? raw.updatedAt ?? new Date().toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function adaptGlobalSentimentResponse(raw: any): SentimentResponse {
  return {
    generatedAt: raw.generatedAt ?? raw.updatedAt ?? new Date().toISOString(),
    countries: (raw.countries ?? []).map((country: any) => ({
      countryCode: country.countryCode,
      sentiment: labelToSentiment(
        country.sentimentLabel ?? country.sentiment ?? "neutral",
        country.sentimentScore
      ),
      sentimentScore: country.sentimentScore ?? 0,
      articleCount: country.articleCount ?? 0,
    })),
  };
}

