import type { SourceCoverage } from "./biasComparison";

export interface TrendingArticle {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  description: string | null;
  imageUrl: string | null;
  category: string;
  sourceCount: number;
  singleSource: boolean;
  otherSources: SourceCoverage[];
}

export interface TrendingResponseData {
  articles: TrendingArticle[];
  total: number;
  updatedAt: string;
}

export interface TrendingResponse extends TrendingResponseData {
  cached: boolean;
}
