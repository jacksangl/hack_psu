import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CacheStore } from "../src/lib/redis";
import { TrendingService } from "../src/services/trendingService";

const { fetchRssMock, getGlobalFeedItemsMock } = vi.hoisted(() => ({
  fetchRssMock: vi.fn(),
  getGlobalFeedItemsMock: vi.fn(),
}));

vi.mock("../src/providers/rssScraperProvider", () => ({
  cleanHtml: (value: string) => value,
  fetchRss: fetchRssMock,
  getGlobalFeedItems: getGlobalFeedItemsMock,
}));

const cacheStore: CacheStore = {
  connect: async () => undefined,
  disconnect: async () => undefined,
  getJson: async () => null,
  setJson: async () => undefined,
  ping: async () => false,
};

describe("TrendingService", () => {
  beforeEach(() => {
    fetchRssMock.mockReset();
    getGlobalFeedItemsMock.mockReset();
  });

  it("groups same-story coverage into one trending item with source metadata", async () => {
    fetchRssMock.mockResolvedValue([
      {
        title: "Port city strike kills 12 after overnight barrage",
        link: "https://example.com/reuters",
        source: "Reuters",
        pubDate: "2026-03-29T10:00:00Z",
        description: "Reuters framing",
        imageUrl: null,
      },
    ]);

    getGlobalFeedItemsMock.mockResolvedValue([
      {
        title: "Overnight barrage kills 12 in port city",
        link: "https://example.com/bbc",
        source: "BBC",
        pubDate: "2026-03-29T09:40:00Z",
        description: "BBC framing",
        imageUrl: null,
      },
      {
        title: "Central bank signals rate cuts for summer meeting",
        link: "https://example.com/ft",
        source: "Financial Times",
        pubDate: "2026-03-29T08:00:00Z",
        description: "FT framing",
        imageUrl: null,
      },
    ]);

    const service = new TrendingService({ cacheStore });
    const response = await service.getTrending();

    expect(response.articles[0].sourceCount).toBe(2);
    expect(response.articles[0].singleSource).toBe(false);
    expect(response.articles[0].otherSources.map((source) => source.source)).toEqual(["BBC"]);
  });

  it("marks isolated coverage as single-source", async () => {
    fetchRssMock.mockResolvedValue([
      {
        title: "Budget talks stall before late-night vote",
        link: "https://example.com/ap",
        source: "AP News",
        pubDate: "2026-03-29T10:00:00Z",
        description: "AP framing",
        imageUrl: null,
      },
    ]);

    getGlobalFeedItemsMock.mockResolvedValue([]);

    const service = new TrendingService({ cacheStore });
    const response = await service.getTrending();

    expect(response.articles[0].sourceCount).toBe(1);
    expect(response.articles[0].singleSource).toBe(true);
    expect(response.articles[0].otherSources).toEqual([]);
  });
});
