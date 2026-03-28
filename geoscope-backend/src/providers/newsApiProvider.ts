import { z } from "zod";

import { AppError } from "../lib/errors";
import type { FetchCountryNewsParams, NewsProvider, ProviderNewsArticle } from "./newsProvider";

const newsApiArticleSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  publishedAt: z.string(),
  description: z.string().nullable().optional(),
  urlToImage: z.string().nullable().optional(),
  source: z
    .object({
      name: z.string().nullable().optional(),
    })
    .optional(),
});

const newsApiResponseSchema = z.object({
  status: z.string(),
  articles: z.array(newsApiArticleSchema).default([]),
  code: z.string().optional(),
  message: z.string().optional(),
});

interface NewsApiProviderOptions {
  apiKey: string;
}

export class NewsApiProvider implements NewsProvider {
  public readonly name = "newsapi";
  private readonly apiKey: string;
  private readonly baseUrl = "https://newsapi.org/v2";

  constructor(options: NewsApiProviderOptions) {
    this.apiKey = options.apiKey;
  }

  async fetchCountryNews(params: FetchCountryNewsParams): Promise<ProviderNewsArticle[]> {
    const response = await fetch(this.buildUrl(params), {
      headers: {
        "X-Api-Key": this.apiKey,
      },
    });

    const payload = newsApiResponseSchema.parse(await response.json());

    if (!response.ok || payload.status !== "ok") {
      throw new AppError(502, "PROVIDER_ERROR", "NewsAPI request failed.", {
        provider: this.name,
        providerCode: payload.code,
        providerMessage: payload.message,
      });
    }

    return payload.articles.map((article) => ({
      rawId: article.url,
      title: article.title,
      source: article.source?.name?.trim() || "Unknown source",
      url: article.url,
      publishedAt: article.publishedAt,
      description: article.description ?? null,
      imageUrl: article.urlToImage ?? null,
    }));
  }

  private buildUrl(params: FetchCountryNewsParams): URL {
    const useEverything = Boolean(params.from || params.to || params.topic);
    const endpoint = useEverything ? "everything" : "top-headlines";
    const url = new URL(`${this.baseUrl}/${endpoint}`);

    if (useEverything) {
      const queryParts = [`"${params.countryName}"`];

      if (params.topic) {
        queryParts.push(`"${params.topic}"`);
      }

      url.searchParams.set("q", queryParts.join(" AND "));
      url.searchParams.set("searchIn", "title,description");
      url.searchParams.set("language", "en");
      url.searchParams.set("sortBy", "publishedAt");
    } else {
      url.searchParams.set("country", params.countryCode.toLowerCase());
    }

    url.searchParams.set("pageSize", String(params.limit));

    if (params.from) {
      url.searchParams.set("from", params.from);
    }

    if (params.to) {
      url.searchParams.set("to", params.to);
    }

    return url;
  }
}
