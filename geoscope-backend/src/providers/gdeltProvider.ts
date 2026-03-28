import { z } from "zod";

import { AppError } from "../lib/errors";
import type { FetchCountryNewsParams, NewsProvider, ProviderNewsArticle } from "./newsProvider";

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

    const response = await fetch(url);

    if (!response.ok) {
      throw new AppError(502, "PROVIDER_ERROR", "GDELT request failed.", {
        provider: this.name,
        status: response.status,
      });
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
  }

  private buildQuery(params: FetchCountryNewsParams): string {
    const parts = [`"${params.countryName}"`];

    if (params.topic) {
      parts.push(`"${params.topic}"`);
    }

    return parts.join(" AND ");
  }
}
