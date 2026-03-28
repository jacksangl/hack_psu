export type SentimentLabel = "negative" | "neutral" | "positive";

export interface ArticleSentiment {
  score: number;
  label: SentimentLabel;
}

export interface GlobalSentimentEntry {
  countryCode: string;
  countryName: string;
  sentimentScore: number;
  sentimentLabel: SentimentLabel;
  articleCount: number;
}

export interface GlobalSentimentResponse {
  updatedAt: string;
  countries: GlobalSentimentEntry[];
  cached: boolean;
}
