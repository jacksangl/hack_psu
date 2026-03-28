import { z } from "zod";
import { AppError } from "../lib/errors";
import { logger } from "../lib/logger";
import type { FetchCountryNewsParams, NewsProvider, ProviderNewsArticle } from "./newsProvider";

const FETCH_TIMEOUT_MS = 15_000;
const MAX_RETRIES = parseInt(process.env.GDELT_MAX_RETRIES ?? "4", 10);
const RETRY_DELAY_MS = parseInt(process.env.GDELT_RETRY_DELAY_MS ?? "2000", 10);
const RATE_LIMIT_DELAY_MS = parseInt(process.env.GDELT_RATE_LIMIT_DELAY_MS ?? "10000", 10);

const gdeltArticleSchema = z
  .object({
    title: z.string(),
    url: z.string().url(),
    seendate: z.string().optional(),
    socialimage: z.string().nullable().optional(),
    domain: z.string().nullable().optional(),
    sourcecountry: z.string().nullable().optional(),
    tone: z.union([z.string(), z.number()]).nullable().optional(),
  })
  .passthrough();

const gdeltResponseSchema = z.object({
  articles: z.array(gdeltArticleSchema).default([]),
});

const toGdeltDate = (date: string, endOfDay = false): string => {
  const suffix = endOfDay ? "235959" : "000000";
  return date.replaceAll("-", "") + suffix;
};

const toIsoTimestamp = (value?: string): string => {
  if (!value || value.length !== 14) {
    return new Date().toISOString();
  }
  const year = value.slice(0, 4);
  const month = value.slice(4, 6);
  const day = value.slice(6, 8);
  const hour = value.slice(8, 10);
  const minute = value.slice(10, 12);
  const second = value.slice(12, 14);
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`).toISOString();
};

const normalizeTone = (value: unknown): number | null => {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return Math.max(-1, Math.min(1, numeric / 10));
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const parseRetryAfterMs = (headerValue: string | null): number | null => {
  if (!headerValue) {
    return null;
  }

  const seconds = Number(headerValue);
  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1_000);
  }

  const date = Date.parse(headerValue);
  if (Number.isNaN(date)) {
    return null;
  }

  return Math.max(0, date - Date.now());
};

export class GdeltProvider implements NewsProvider {
  public readonly name = "gdelt";
  private readonly baseUrl = "https://api.gdeltproject.org/api/v2/doc/doc";

  async fetchCountryNews(params: FetchCountryNewsParams): Promise<ProviderNewsArticle[]> {
    const url = new URL(this.baseUrl);
    url.searchParams.set("query", this.buildQuery(params));
    url.searchParams.set("mode", "ArtList");
    url.searchParams.set("format", "json");
    url.searchParams.set("maxrecords", String(params.limit));
    url.searchParams.set("sort", "DateDesc");

    if (params.from) {
      url.searchParams.set("startdatetime", toGdeltDate(params.from));
    }
    if (params.to) {
      url.searchParams.set("enddatetime", toGdeltDate(params.to, true));
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      try {
        const response = await fetch(url, { signal: controller.signal });

        if (!response.ok) {
          const retryDelayMs =
            response.status === 429
              ? parseRetryAfterMs(response.headers.get("retry-after")) ?? RATE_LIMIT_DELAY_MS * (attempt + 1)
              : RETRY_DELAY_MS * (attempt + 1);
          const error = new AppError(502, "PROVIDER_ERROR", `GDELT returned ${response.status}`, {
            provider: this.name,
            status: response.status,
            countryCode: params.countryCode,
          });

          lastError = error;

          if ((response.status === 429 || response.status >= 500) && attempt < MAX_RETRIES) {
            logger.warn("gdelt fetch failed", {
              countryCode: params.countryCode,
              attempt,
              errorName: error.name,
              errorMessage: error.message,
              retryDelayMs,
              url: url.toString(),
            });
            await sleep(retryDelayMs);
            continue;
          }

          throw error;
        }

        const payload = gdeltResponseSchema.parse(await response.json());

        return payload.articles.map((article) => ({
          rawId: article.url,
          title: article.title,
          source: article.domain?.trim() || article.sourcecountry?.trim() || "GDELT",
          url: article.url,
          publishedAt: toIsoTimestamp(article.seendate),
          description: null,
          imageUrl: article.socialimage ?? null,
          locationName: params.countryName,
          toneScore: normalizeTone(article.tone),
        }));
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        const shouldRetry = !(error instanceof AppError) && attempt < MAX_RETRIES;
        const retryDelayMs = RETRY_DELAY_MS * (attempt + 1);

        logger.warn("gdelt fetch failed", {
          countryCode: params.countryCode,
          attempt,
          errorName: lastError.name,
          errorMessage: lastError.message,
          retryDelayMs: shouldRetry ? retryDelayMs : undefined,
          url: url.toString(),
        });

        if (!shouldRetry) {
          throw error;
        }

        await sleep(retryDelayMs);
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new AppError(502, "PROVIDER_ERROR", `GDELT failed after ${MAX_RETRIES + 1} attempts: ${lastError?.message}`, {
      provider: this.name,
      countryCode: params.countryCode,
    });
  }

  private buildQuery(params: FetchCountryNewsParams): string {
    const parts = [`"${params.countryName}"`];
    if (params.topic) {
      parts.push(`"${params.topic}"`);
    }
    return parts.join(" AND ");
  }
}
