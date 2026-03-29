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
