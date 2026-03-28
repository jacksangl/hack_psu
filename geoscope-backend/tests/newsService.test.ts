import { describe, expect, it, vi } from "vitest";

import type { CacheStore } from "../src/lib/redis";
import type { NewsProvider, ProviderNewsArticle } from "../src/providers/newsProvider";
import { NewsService } from "../src/services/newsService";

const createArticle = (overrides: Partial<ProviderNewsArticle> = {}): ProviderNewsArticle => ({
  publishedAt: "2026-03-28T12:00:00Z",
  source: "Example News",
  title: "Example article",
  url: "https://example.com/default",
  ...overrides,
});

const createCacheStore = (): CacheStore & {
  setJsonMock: ReturnType<typeof vi.fn>;
  getJsonMock: ReturnType<typeof vi.fn>;
} => {
  const getJsonMock = vi.fn(async () => null);
  const setJsonMock = vi.fn(async () => undefined);

  return {
    connect: async () => undefined,
    disconnect: async () => undefined,
    getJson: getJsonMock,
    getJsonMock,
    ping: async () => true,
    setJson: setJsonMock,
    setJsonMock,
  };
};

describe("NewsService", () => {
  it("collects until the minimum target, dedupes raw articles, and caches full results", async () => {
    const cacheStore = createCacheStore();
    const primaryProvider: NewsProvider = {
      fetchCountryNews: vi.fn(async (params) => {
        if (params.queryMode === "top-headlines") {
          return [
            createArticle({
              publishedAt: "2026-03-28T08:00:00Z",
              title: "Top headline 1",
              url: "https://example.com/a",
            }),
            createArticle({
              publishedAt: "2026-03-28T07:00:00Z",
              title: "Top headline 2",
              url: "https://example.com/b",
            }),
          ];
        }

        return [
          createArticle({
            publishedAt: "2026-03-28T07:00:00Z",
            title: "Duplicate top headline 2",
            url: "https://example.com/b",
          }),
          createArticle({
            publishedAt: "2026-03-28T09:00:00Z",
            title: "Everything article 1",
            url: "https://example.com/c",
          }),
        ];
      }),
      name: "newsapi",
    };
    const secondaryProvider: NewsProvider = {
      fetchCountryNews: vi.fn(async () => [
        createArticle({
          publishedAt: "2026-03-28T10:00:00Z",
          title: "GDELT article 1",
          url: "https://example.com/d",
        }),
        createArticle({
          publishedAt: "2026-03-28T11:00:00Z",
          title: "GDELT article 2",
          url: "https://example.com/e",
        }),
      ]),
      name: "gdelt",
    };

    const service = new NewsService({
      cacheStore,
      primaryProvider,
      secondaryProvider,
    });

    const response = await service.getCountryNews({
      countryCode: "US",
      limit: 10,
    });

    expect(response.cached).toBe(false);
    expect(response.total).toBe(5);
    expect(response.articles.map((article) => article.url)).toEqual([
      "https://example.com/e",
      "https://example.com/d",
      "https://example.com/c",
      "https://example.com/a",
      "https://example.com/b",
    ]);
    expect(primaryProvider.fetchCountryNews).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ queryMode: "top-headlines" }),
    );
    expect(primaryProvider.fetchCountryNews).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ queryMode: "everything" }),
    );
    expect(secondaryProvider.fetchCountryNews).toHaveBeenCalledTimes(1);
    expect(cacheStore.setJsonMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ total: 5 }),
      15 * 60,
    );
  });

  it("uses a short ttl when the merged result stays sparse", async () => {
    const cacheStore = createCacheStore();
    const primaryProvider: NewsProvider = {
      fetchCountryNews: vi.fn(async (params) =>
        params.queryMode === "top-headlines"
          ? [
              createArticle({
                publishedAt: "2026-03-28T08:00:00Z",
                title: "Top headline 1",
                url: "https://example.com/a",
              }),
            ]
          : [],
      ),
      name: "newsapi",
    };
    const secondaryProvider: NewsProvider = {
      fetchCountryNews: vi.fn(async () => [
        createArticle({
          publishedAt: "2026-03-28T07:00:00Z",
          title: "GDELT article 1",
          url: "https://example.com/b",
        }),
      ]),
      name: "gdelt",
    };

    const service = new NewsService({
      cacheStore,
      primaryProvider,
      secondaryProvider,
    });

    const response = await service.getCountryNews({
      countryCode: "US",
      limit: 10,
    });

    expect(response.total).toBe(2);
    expect(cacheStore.setJsonMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ total: 2 }),
      90,
    );
  });

  it("skips providers when the response is cached", async () => {
    const cacheStore = createCacheStore();
    cacheStore.getJsonMock.mockResolvedValue({
      articles: [],
      countryCode: "US",
      countryName: "United States",
      total: 0,
    });

    const primaryProvider: NewsProvider = {
      fetchCountryNews: vi.fn(async () => []),
      name: "newsapi",
    };
    const secondaryProvider: NewsProvider = {
      fetchCountryNews: vi.fn(async () => []),
      name: "gdelt",
    };

    const service = new NewsService({
      cacheStore,
      primaryProvider,
      secondaryProvider,
    });

    const response = await service.getCountryNews({
      countryCode: "US",
      limit: 10,
    });

    expect(response.cached).toBe(true);
    expect(primaryProvider.fetchCountryNews).not.toHaveBeenCalled();
    expect(secondaryProvider.fetchCountryNews).not.toHaveBeenCalled();
  });

  it("uses the explicit everything mode when topic filters are present", async () => {
    const cacheStore = createCacheStore();
    const primaryProvider: NewsProvider = {
      fetchCountryNews: vi.fn(async () => [
        createArticle({
          publishedAt: "2026-03-28T08:00:00Z",
          title: "Topic article 1",
          url: "https://example.com/a",
        }),
        createArticle({
          publishedAt: "2026-03-28T07:00:00Z",
          title: "Topic article 2",
          url: "https://example.com/b",
        }),
        createArticle({
          publishedAt: "2026-03-28T06:00:00Z",
          title: "Topic article 3",
          url: "https://example.com/c",
        }),
        createArticle({
          publishedAt: "2026-03-28T05:00:00Z",
          title: "Topic article 4",
          url: "https://example.com/d",
        }),
        createArticle({
          publishedAt: "2026-03-28T04:00:00Z",
          title: "Topic article 5",
          url: "https://example.com/e",
        }),
      ]),
      name: "newsapi",
    };
    const secondaryProvider: NewsProvider = {
      fetchCountryNews: vi.fn(async () => []),
      name: "gdelt",
    };

    const service = new NewsService({
      cacheStore,
      primaryProvider,
      secondaryProvider,
    });

    await service.getCountryNews({
      countryCode: "US",
      limit: 10,
      topic: "Economy",
    });

    expect(primaryProvider.fetchCountryNews).toHaveBeenCalledTimes(1);
    expect(primaryProvider.fetchCountryNews).toHaveBeenCalledWith(
      expect.objectContaining({ queryMode: "everything", topic: "Economy" }),
    );
    expect(secondaryProvider.fetchCountryNews).not.toHaveBeenCalled();
  });
});
