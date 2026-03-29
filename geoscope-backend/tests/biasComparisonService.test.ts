import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CacheStore } from "../src/lib/redis";
import type { AiProvider } from "../src/providers/aiProvider";
import { BiasComparisonService } from "../src/services/biasComparisonService";

const { fetchRssMock } = vi.hoisted(() => ({
  fetchRssMock: vi.fn(),
}));

vi.mock("../src/providers/rssScraperProvider", () => ({
  cleanHtml: (value: string) => value,
  fetchRss: fetchRssMock,
}));

const cacheStore: CacheStore = {
  connect: async () => undefined,
  disconnect: async () => undefined,
  getJson: async () => null,
  setJson: async () => undefined,
  ping: async () => false,
};

const aiProvider: AiProvider = {
  generateBrief: vi.fn(async () => {
    throw new Error("not used");
  }),
  generateComparison: vi.fn(async ({ otherSources }) => ({
    storyTitle: "Neutral story",
    originalSummary: "Original framing summary",
    sourceSummaries: otherSources.map((source) => `${source.source} summary`),
    keyDifferences: ["Different emphasis"],
  })),
  name: "gemini",
};

describe("BiasComparisonService", () => {
  beforeEach(() => {
    fetchRssMock.mockReset();
    vi.mocked(aiProvider.generateComparison).mockClear();
  });

  it("keeps alternate Google News results when their sources differ", async () => {
    fetchRssMock.mockResolvedValue([
      {
        title: "Original headline duplicate host",
        link: "https://news.google.com/rss/articles/source-1",
        source: "Yahoo Sports",
        pubDate: "2026-03-29T00:00:00Z",
        description: "Duplicate source",
      },
      {
        title: "Same story from MMA Junkie",
        link: "https://news.google.com/rss/articles/source-2",
        source: "MMA Junkie",
        pubDate: "2026-03-29T00:00:00Z",
        description: "MMA Junkie framing",
      },
      {
        title: "Same story from CBS Sports",
        link: "https://news.google.com/rss/articles/source-3",
        source: "CBS Sports",
        pubDate: "2026-03-29T00:00:00Z",
        description: "CBS framing",
      },
    ]);

    const service = new BiasComparisonService({
      aiProvider,
      cacheStore,
    });

    const response = await service.compare({
      source: "Yahoo Sports",
      title: "UFC Seattle live results: Israel Adesanya vs. Joe Pyfer updates",
      url: "https://news.google.com/rss/articles/original-source",
    });

    expect(response.otherSources.map((source) => source.source)).toEqual([
      "MMA Junkie",
      "CBS Sports",
    ]);
    expect(response.keyDifferences).toEqual(["Different emphasis"]);
    expect(aiProvider.generateComparison).toHaveBeenCalledOnce();
  });
});
