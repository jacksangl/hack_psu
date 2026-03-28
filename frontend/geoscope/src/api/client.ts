import {
  getMockNews,
  getMockBrief,
  getMockGlobalSentiment,
  type NewsResponse,
  type BriefResponse,
  type SentimentResponse,
} from "./mockData";
import type { Sentiment } from "../utils/sentimentColors";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// ---- helpers to bridge backend → frontend shapes ----

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformNews(raw: any): NewsResponse {
  return {
    countryCode: raw.countryCode,
    countryName: raw.countryName,
    articles: (raw.articles ?? []).map((a: any) => ({
      id: a.id,
      title: a.title,
      source: a.source,
      publishedAt: a.publishedAt,
      url: a.url,
      lat: a.latitude ?? 0,
      lng: a.longitude ?? 0,
      sentiment: labelToSentiment(
        a.sentiment?.label ?? "neutral",
        a.sentiment?.score
      ),
      relatedCountries: a.relatedCountries ?? [],
    })),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformBrief(raw: any): BriefResponse {
  const label: string = raw.sentiment ?? "neutral";
  return {
    countryCode: raw.countryCode,
    summary: raw.summary,
    sentiment: labelToSentiment(label) as Sentiment,
    sentimentScore: raw.sentimentScore ?? labelToScore(label),
    keyActors: raw.keyActors ?? [],
    topicTags: raw.topicTags ?? [],
    articleCount: raw.articleCount ?? 0,
    lastUpdated: raw.lastUpdated ?? raw.updatedAt ?? new Date().toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformGlobalSentiment(raw: any): SentimentResponse {
  return {
    generatedAt: raw.generatedAt ?? raw.updatedAt ?? new Date().toISOString(),
    countries: (raw.countries ?? []).map((c: any) => ({
      countryCode: c.countryCode,
      sentiment: labelToSentiment(
        c.sentimentLabel ?? c.sentiment ?? "neutral",
        c.sentimentScore
      ),
      sentimentScore: c.sentimentScore ?? 0,
    })),
  };
}

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
    return transformNews(raw);
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
    return transformBrief(raw);
  } catch {
    const mock = getMockBrief(countryCode);
    if (!mock) throw new Error(`No data available for ${countryCode}`);
    return mock;
  }
}

export async function fetchGlobalSentiment(): Promise<SentimentResponse> {
  try {
    const raw = await fetchJson("/api/sentiment/global");
    return transformGlobalSentiment(raw);
  } catch {
    return getMockGlobalSentiment();
  }
}
