import type { SentimentLabel } from "./sentiment";

export interface StoredCountryArticle {
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
  sentiment: {
    score: number;
    label: SentimentLabel;
  };
  topics: string[];
  relatedCountries: string[];
  locationName: string | null;
}

export interface CountrySnapshotRecord {
  countryCode: string;
  countryName: string;
  refreshedAt: string;
  articleCount: number;
  sentimentScore: number;
  sentimentLabel: SentimentLabel;
  provider: string;
  sourceCount: number;
  isStale: boolean;
}

export interface IngestionRunSummary {
  startedAt: string;
  finishedAt: string;
  status: "completed" | "failed";
  countriesAttempted: number;
  countriesSucceeded: number;
  errorSummary: string | null;
}
