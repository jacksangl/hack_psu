import type { ArticleSentiment } from "./sentiment";

export interface Article {
  id: string;
  countryCode: string;
  countryName: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  description: string | null;
  imageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  sentiment: ArticleSentiment;
  topics: string[];
  locationName: string | null;
}

export interface NewsQueryOptions {
  limit: number;
  from?: string;
  to?: string;
  topic?: string;
}

export interface NewsResponseData {
  countryCode: string;
  countryName: string;
  articles: Article[];
  total: number;
}

export interface NewsResponse extends NewsResponseData {
  cached: boolean;
}
