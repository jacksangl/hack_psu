import { describe, expect, it, vi } from "vitest";

import type { CacheStore } from "../src/lib/redis";
import { NewsRepository } from "../src/repositories/newsRepository";
import { NewsService } from "../src/services/newsService";

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
  it("reads stored country articles from the repository and caches the response", async () => {
    const cacheStore = createCacheStore();
    const repository = {
      getCountryArticles: vi.fn(async () => [
        {
          countryCode: "US",
          countryName: "United States",
          description: null,
          id: "article-1",
          imageUrl: null,
          latitude: 37.0902,
          locationName: "United States",
          longitude: -95.7129,
          publishedAt: "2026-03-28T12:00:00.000Z",
          sentiment: {
            label: "neutral",
            score: 0,
          },
          source: "Example News",
          title: "Stored article",
          topics: [],
          url: "https://example.com/article-1",
        },
      ]),
    } as unknown as NewsRepository;

    const service = new NewsService({
      cacheStore,
      repository,
    });

    const response = await service.getCountryNews({
      countryCode: "US",
      limit: 5,
    });

    expect(response.cached).toBe(false);
    expect(response.total).toBe(1);
    expect(repository.getCountryArticles).toHaveBeenCalledWith("US", 5);
    expect(cacheStore.setJsonMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        countryCode: "US",
        total: 1,
      }),
      15 * 60,
    );
  });

  it("returns the cached country response without hitting the repository", async () => {
    const cacheStore = createCacheStore();
    cacheStore.getJsonMock.mockResolvedValue({
      articles: [],
      countryCode: "US",
      countryName: "United States",
      total: 0,
    });
    const repository = {
      getCountryArticles: vi.fn(async () => []),
    } as unknown as NewsRepository;

    const service = new NewsService({
      cacheStore,
      repository,
    });

    const response = await service.getCountryNews({
      countryCode: "US",
      limit: 5,
    });

    expect(response.cached).toBe(true);
    expect(repository.getCountryArticles).not.toHaveBeenCalled();
  });
});
