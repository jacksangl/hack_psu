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
  generateComparison: vi.fn(async ({ otherSources }: { otherSources: Array<{ source: string }> }) => ({
    storyTitle: "Neutral story",
    bulletSummary: ["Shared core event"],
    originalSummary: "Original framing summary",
    sourceSummaries: otherSources.map((source) => `${source.source} summary`),
    keyDifferences: ["Different emphasis"],
    keyTopics: ["Topic A"],
    consensus: ["All agree on X"],
    disagreements: ["Differ on Y"],
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
        title: "UFC Seattle live results: Israel Adesanya vs. Joe Pyfer live updates - MMA Junkie",
        link: "https://news.google.com/rss/articles/source-2",
        source: "MMA Junkie",
        pubDate: "2026-03-29T00:00:00Z",
        description: "MMA Junkie framing",
      },
      {
        title: "UFC Seattle live results: Israel Adesanya vs. Joe Pyfer updates - CBS Sports",
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
    expect(response.bulletSummary).toEqual(["Shared core event"]);
    expect(response.keyDifferences).toEqual(["Different emphasis"]);
    expect(aiProvider.generateComparison).toHaveBeenCalledOnce();
  });

  it("fills bullet summary and agreement sections from fallback when AI returns blanks", async () => {
    vi.mocked(aiProvider.generateComparison).mockResolvedValueOnce({
      storyTitle: "Neutral story",
      bulletSummary: [],
      originalSummary: "",
      sourceSummaries: [],
      keyDifferences: [],
      keyTopics: [],
      consensus: [],
      disagreements: [],
    });

    fetchRssMock.mockResolvedValue([
      {
        title: "Missile strike hits port city after overnight barrage",
        link: "https://news.google.com/rss/articles/source-a",
        source: "Reuters",
        pubDate: "2026-03-29T00:00:00Z",
        description: "Reuters description",
      },
      {
        title: "Port city missile strike kills 12 in overnight barrage",
        link: "https://news.google.com/rss/articles/source-b",
        source: "BBC",
        pubDate: "2026-03-29T02:00:00Z",
        description: "BBC description",
      },
    ]);

    const service = new BiasComparisonService({
      aiProvider,
      cacheStore,
    });

    const response = await service.compare({
      source: "AP News",
      title: "Overnight missile strike hits port city, killing 12",
      url: "https://example.com/original",
    });

    expect(response.bulletSummary.length).toBeGreaterThan(0);
    expect(response.consensus.length).toBeGreaterThan(0);
    expect(response.disagreements.length).toBeGreaterThan(0);
  });

  it("returns a single-source flag instead of fabricating a comparison", async () => {
    fetchRssMock.mockResolvedValue([
      {
        title: "Original outlet repeats the same headline",
        link: "https://news.google.com/rss/articles/source-only",
        source: "AP News",
        pubDate: "2026-03-29T00:00:00Z",
        description: "AP description",
      },
    ]);

    const service = new BiasComparisonService({
      aiProvider,
      cacheStore,
    });

    const response = await service.compare({
      source: "AP News",
      title: "Aid convoy reaches the border after overnight delay",
      url: "https://example.com/original",
      description: "Original article description",
    });

    expect(response.singleSource).toBe(true);
    expect(response.otherSources).toEqual([]);
    expect(response.bulletSummary).toEqual([]);
    expect(response.keyDifferences).toEqual([]);
    expect(aiProvider.generateComparison).not.toHaveBeenCalled();
  });
});
