import type { Sentiment } from "../../utils/sentimentColors";

export type NewsCategory =
  | "politics"
  | "conflict"
  | "economy"
  | "business"
  | "climate"
  | "health"
  | "technology"
  | "sports"
  | "culture"
  | "diplomacy";

export interface Article {
  id: string;
  title: string;
  source: string;
  publishedAt: string;
  url: string;
  lat: number;
  lng: number;
  sentiment: Sentiment;
  relatedCountries: string[];
  category: NewsCategory;
}

export interface NewsResponse {
  countryCode: string;
  countryName: string;
  articles: Article[];
}

export interface BriefResponse {
  countryCode: string;
  summary: string;
  sentiment: Sentiment;
  sentimentScore: number;
  keyActors: string[];
  topicTags: string[];
  articleCount: number;
  lastUpdated: string;
}

export interface SentimentEntry {
  countryCode: string;
  sentiment: Sentiment;
  sentimentScore: number;
  articleCount: number;
}

export interface SentimentResponse {
  countries: SentimentEntry[];
  generatedAt: string;
}

