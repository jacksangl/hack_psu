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

  it("dedupes publisher aliases and same-article URLs inside story coverage", async () => {
    fetchRssMock.mockResolvedValue([
      {
        title: "Port blast investigation expands after warehouse failures",
        link: "https://www.nytimes.com/2026/03/29/world/europe/port-blast.html?utm_source=rss",
        source: "The New York Times",
        pubDate: "2026-03-29T10:00:00Z",
        description: "NYT framing",
        imageUrl: null,
      },
    ]);

    getGlobalFeedItemsMock.mockResolvedValue([
      {
        title: "Warehouse failures under scrutiny after deadly port blast",
        link: "https://nytimes.com/2026/03/29/world/europe/port-blast.html?utm_medium=social",
        source: "nytimes.com",
        pubDate: "2026-03-29T09:55:00Z",
        description: "Duplicate NYT framing",
        imageUrl: null,
      },
      {
        title: "Deadly port blast probe turns to warehouse safety",
        link: "https://www.reuters.com/world/europe/port-blast-probe",
        source: "Reuters",
        pubDate: "2026-03-29T09:45:00Z",
        description: "Reuters framing",
        imageUrl: null,
      },
    ]);

    const service = new TrendingService({ cacheStore });
    const response = await service.getTrending();

    expect(response.articles[0].sourceCount).toBe(2);
    expect(response.articles[0].otherSources.map((source) => source.source)).toEqual(["Reuters"]);
  });

  it("groups same protest story when headlines use different wording", async () => {
    fetchRssMock.mockResolvedValue([
      {
        title: "\"No Kings\" protests swell across the US ahead of weekend demonstrations",
        link: "https://example.com/ap-no-kings",
        source: "AP News",
        pubDate: "2026-03-29T10:00:00Z",
        description: "Organizers of the No Kings movement rallied crowds across America opposing Trump.",
        imageUrl: null,
      },
    ]);

    getGlobalFeedItemsMock.mockResolvedValue([
      {
        title: "Crowds gather nationwide in anti-Trump rallies as No Kings movement spreads",
        link: "https://example.com/reuters-no-kings",
        source: "Reuters",
        pubDate: "2026-03-29T09:40:00Z",
        description: "The demonstrations, branded No Kings protests, drew marchers across the United States.",
        imageUrl: null,
      },
      {
        title: "Lawmakers debate budget package after late-night committee vote",
        link: "https://example.com/politico-budget",
        source: "Politico",
        pubDate: "2026-03-29T09:20:00Z",
        description: "Unrelated politics coverage",
        imageUrl: null,
      },
    ]);

    const service = new TrendingService({ cacheStore });
    const response = await service.getTrending();

    expect(response.articles[0].sourceCount).toBe(2);
    expect(response.articles[0].otherSources.map((source) => source.source)).toEqual(["Reuters"]);
  });

  it("expands clusters when later articles match the story better than the lead headline", async () => {
    fetchRssMock.mockResolvedValue([
      {
        title: "Weekend demonstrations planned across major US cities",
        link: "https://example.com/cnn-weekend-demo",
        source: "CNN",
        pubDate: "2026-03-29T10:00:00Z",
        description: "Organizers said the protests are tied to the No Kings movement.",
        imageUrl: null,
      },
    ]);

    getGlobalFeedItemsMock.mockResolvedValue([
      {
        title: "Anti-Trump marches under 'No Kings' banner held nationwide",
        link: "https://example.com/bbc-no-kings",
        source: "BBC",
        pubDate: "2026-03-29T09:50:00Z",
        description: "No Kings organizers called for rallies in cities across the country.",
        imageUrl: null,
      },
      {
        title: "\"No Kings\" protests draw crowds in cities across America",
        link: "https://example.com/guardian-no-kings",
        source: "The Guardian",
        pubDate: "2026-03-29T09:35:00Z",
        description: "Weekend demonstrations connected to the No Kings movement spread nationwide.",
        imageUrl: null,
      },
    ]);

    const service = new TrendingService({ cacheStore });
    const response = await service.getTrending();

    expect(response.articles[0].sourceCount).toBe(3);
    expect(response.articles[0].otherSources.map((source) => source.source).sort()).toEqual([
      "BBC",
      "The Guardian",
    ]);
  });
});
