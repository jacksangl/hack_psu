import {
  adaptCountryBriefResponse,
  adaptCountryNewsResponse,
  adaptGlobalSentimentResponse,
} from "./adapters";
import {
  getMockNews,
  getMockBrief,
  getMockGlobalSentiment,
} from "./mockData";
import type {
  BriefResponse,
  NewsResponse,
  SentimentResponse,
} from "./types";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// ---- fetch with mock-data fallback ----

async function fetchJson(path: string): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchCountryNews(
  countryCode: string
): Promise<NewsResponse> {
  try {
    const raw = await fetchJson(`/api/news/${countryCode}`);
    return adaptCountryNewsResponse(raw);
  } catch {
    const mock = getMockNews(countryCode);
    if (!mock) throw new Error(`No data available for ${countryCode}`);
    return mock;
  }
}

export async function fetchCountryBrief(
  countryCode: string
): Promise<BriefResponse> {
  try {
    const raw = await fetchJson(`/api/brief/${countryCode}`);
    return adaptCountryBriefResponse(raw);
  } catch {
    const mock = getMockBrief(countryCode);
    if (!mock) throw new Error(`No data available for ${countryCode}`);
    return mock;
  }
}

export async function fetchGlobalSentiment(): Promise<SentimentResponse> {
  try {
    const raw = await fetchJson("/api/sentiment/global");
    return adaptGlobalSentimentResponse(raw);
  } catch {
    return getMockGlobalSentiment();
  }
}

// ---- Trending news ----

export interface TrendingArticle {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  description: string | null;
  category: string;
}

export interface TrendingResponse {
  articles: TrendingArticle[];
  total: number;
  updatedAt: string;
  cached: boolean;
}

export async function fetchTrendingNews(
  category?: string
): Promise<TrendingResponse> {
  const params = category ? `?category=${encodeURIComponent(category)}` : "";
  const raw = await fetchJson(`/api/news/trending${params}`);
  return raw as TrendingResponse;
}

// ---- Bias comparison ----

export interface SourceCoverage {
  source: string;
  headline: string;
  summary: string;
  url: string;
}

export interface BiasComparisonResponse {
  storyTitle: string;
  originalSource: SourceCoverage;
  otherSources: SourceCoverage[];
  keyDifferences: string[];
  cached: boolean;
}

export async function fetchBiasComparison(
  title: string,
  source: string,
  url: string
): Promise<BiasComparisonResponse> {
  const params = new URLSearchParams({ title, source, url });
  const raw = await fetchJson(`/api/article/compare?${params.toString()}`);
  return raw as BiasComparisonResponse;
}
