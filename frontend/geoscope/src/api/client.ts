import {
  getMockNews,
  getMockBrief,
  getMockGlobalSentiment,
  type NewsResponse,
  type BriefResponse,
  type SentimentResponse,
} from "./mockData";

const BASE_URL = "http://localhost:3001";

async function fetchWithFallback<T>(
  path: string,
  fallback: () => T | null
): Promise<T> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } catch {
    const mock = fallback();
    if (!mock) {
      throw new Error(`No data available for ${path}`);
    }
    return mock;
  }
}

export async function fetchCountryNews(
  countryCode: string
): Promise<NewsResponse> {
  return fetchWithFallback(`/api/news/${countryCode}`, () =>
    getMockNews(countryCode)
  );
}

export async function fetchCountryBrief(
  countryCode: string
): Promise<BriefResponse> {
  return fetchWithFallback(`/api/brief/${countryCode}`, () =>
    getMockBrief(countryCode)
  );
}

export async function fetchGlobalSentiment(): Promise<SentimentResponse> {
  return fetchWithFallback("/api/sentiment/global", getMockGlobalSentiment);
}
