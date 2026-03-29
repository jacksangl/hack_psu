import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CacheStore } from "../src/lib/redis";
import type { AiProvider } from "../src/providers/aiProvider";
import { BiasComparisonService } from "../src/services/biasComparisonService";

const { fetchRssMock, getGlobalFeedItemsMock, fetchArticleContextMock } = vi.hoisted(() => ({
  fetchRssMock: vi.fn(),
  getGlobalFeedItemsMock: vi.fn(),
  fetchArticleContextMock: vi.fn(),
}));

vi.mock("../src/providers/rssScraperProvider", () => ({
  cleanHtml: (value: string) => value,
  fetchRss: fetchRssMock,
  getGlobalFeedItems: getGlobalFeedItemsMock,
}));

vi.mock("../src/providers/articleContextProvider", () => ({
  fetchArticleContext: fetchArticleContextMock,
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
    originalBias: {
      emphasizedDetails: ["Lead framing", "Primary emphasis"],
      overallOpinion: "Largely matter-of-fact and focused on the central event.",
    },
    sourceBiases: otherSources.map((source) => ({
      emphasizedDetails: [`${source.source} emphasis`, `${source.source} framing`],
      overallOpinion: `${source.source} is mostly focused on its chosen angle of the story.`,
    })),
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
    getGlobalFeedItemsMock.mockReset();
    fetchArticleContextMock.mockReset();
    getGlobalFeedItemsMock.mockResolvedValue([]);
    fetchArticleContextMock.mockResolvedValue({
      summary: null,
      evidence: [],
    });
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
    expect(response.originalSource.detectedBias?.overallOpinion).toContain("matter-of-fact");
    expect(response.otherSources[0]?.detectedBias?.emphasizedDetails.length).toBeGreaterThan(0);
    expect(response.bulletSummary).toEqual(["Shared core event"]);
    expect(response.keyDifferences).toEqual(["Different emphasis"]);
    expect(aiProvider.generateComparison).toHaveBeenCalledOnce();
  });

  it("passes fetched article evidence into comparison generation and fallback summaries", async () => {
    vi.mocked(aiProvider.generateComparison).mockResolvedValueOnce({
      storyTitle: "Neutral story",
      bulletSummary: [],
      originalSummary: "",
      sourceSummaries: [],
      originalBias: { emphasizedDetails: [], overallOpinion: "" },
      sourceBiases: [],
      keyDifferences: [],
      keyTopics: [],
      consensus: [],
      disagreements: [],
    });

    fetchArticleContextMock
      .mockResolvedValueOnce({
        summary: "Original article says the protests spread to multiple state capitals.",
        evidence: [
          "Organizers called the demonstrations the largest coordinated action of the month.",
          "Police in two cities said arrests followed clashes near government buildings.",
        ],
      })
      .mockResolvedValueOnce({
        summary: "Reuters focuses on arrests near government buildings.",
        evidence: [
          "Police in two cities said arrests followed clashes near government buildings.",
          "Officials said traffic around the statehouse was shut down for hours.",
        ],
      });

    fetchRssMock.mockResolvedValue([]);

    const service = new BiasComparisonService({
      aiProvider,
      cacheStore,
    });

    const response = await service.compare({
      source: "AP News",
      title: "No Kings protests spread across state capitals",
      url: "https://example.com/original-story",
      description: "AP description",
      knownSources: [
        {
          source: "Reuters",
          headline: "No Kings protests lead to arrests near statehouses",
          summary: "Reuters description",
          url: "https://example.com/reuters-story",
        },
      ],
    });

    expect(aiProvider.generateComparison).toHaveBeenCalledWith(
      expect.objectContaining({
        originalArticle: expect.objectContaining({
          evidence: expect.arrayContaining([
            "Organizers called the demonstrations the largest coordinated action of the month.",
          ]),
        }),
        otherSources: [
          expect.objectContaining({
            source: "Reuters",
            evidence: expect.arrayContaining([
              "Officials said traffic around the statehouse was shut down for hours.",
            ]),
          }),
        ],
      }),
    );
    expect(response.originalSource.summary).toEqual(
      expect.stringMatching(/state capitals|largest coordinated action/),
    );
    expect(response.otherSources[0]?.summary).toContain("arrests");
    expect(response.otherSources[0]?.detectedBias?.emphasizedDetails.length).toBeGreaterThan(0);
  });

  it("backfills detected bias for cached comparisons created before bias analysis existed", async () => {
    const cachedComparison = {
      storyTitle: "Cached story",
      bulletSummary: ["Cached summary point"],
      originalSource: {
        source: "AP News",
        headline: "Cached original headline",
        summary: "Cached original framing summary",
        url: "https://example.com/cached-original",
      },
      otherSources: [
        {
          source: "Reuters",
          headline: "Cached related headline",
          summary: "Cached Reuters framing summary",
          url: "https://example.com/cached-related",
        },
      ],
      keyDifferences: ["Cached difference"],
      keyTopics: ["Cached topic"],
      consensus: ["Cached consensus"],
      disagreements: ["Cached disagreement"],
      singleSource: false,
    };

    const cachedStore: CacheStore = {
      ...cacheStore,
      getJson: async <T>() => cachedComparison as T,
    };

    const service = new BiasComparisonService({
      aiProvider,
      cacheStore: cachedStore,
    });

    const response = await service.compare({
      source: "AP News",
      title: "Cached original headline",
      url: "https://example.com/cached-original",
    });

    expect(response.cached).toBe(true);
    expect(response.originalSource.detectedBias?.overallOpinion).toContain("Cached original framing summary");
    expect(response.otherSources[0]?.detectedBias?.overallOpinion).toContain("Cached Reuters framing summary");
    expect(response.otherSources[0]?.detectedBias?.emphasizedDetails.length).toBeGreaterThan(0);
    expect(fetchRssMock).not.toHaveBeenCalled();
    expect(aiProvider.generateComparison).not.toHaveBeenCalled();
  });

  it("searches for additional reporting even when seeded sources are provided", async () => {
    fetchRssMock.mockResolvedValue([
      {
        title: "Port blast investigation focuses on storage failures - BBC",
        link: "https://news.google.com/rss/articles/source-bbc",
        source: "BBC",
        pubDate: "2026-03-29T00:00:00Z",
        description: "BBC framing",
      },
      {
        title: "Port blast investigators examine warehouse oversight - Reuters",
        link: "https://news.google.com/rss/articles/source-reuters",
        source: "Reuters",
        pubDate: "2026-03-29T01:00:00Z",
        description: "Reuters framing",
      },
      {
        title: "Officials probe warehouse failures after deadly port blast - AP News",
        link: "https://news.google.com/rss/articles/source-ap",
        source: "AP News",
        pubDate: "2026-03-29T02:00:00Z",
        description: "AP framing",
      },
    ]);

    const service = new BiasComparisonService({
      aiProvider,
      cacheStore,
    });

    const response = await service.compare({
      source: "CNN",
      title: "Deadly port blast investigation turns to warehouse safety failures",
      url: "https://example.com/original-story",
      knownSources: [
        {
          source: "BBC",
          headline: "Port blast investigation focuses on storage failures",
          summary: "BBC seeded summary",
          url: "https://example.com/bbc-story",
        },
      ],
    });

    expect(response.otherSources[0]?.source).toBe("BBC");
    expect(response.otherSources.map((source) => source.source).sort()).toEqual([
      "AP News",
      "BBC",
      "Reuters",
    ]);
    expect(aiProvider.generateComparison).toHaveBeenCalledWith(
      expect.objectContaining({
        otherSources: expect.arrayContaining([
          expect.objectContaining({ source: "BBC" }),
          expect.objectContaining({ source: "Reuters" }),
          expect.objectContaining({ source: "AP News" }),
        ]),
      }),
    );
  });

  it("dedupes publisher aliases and same-article URLs as one source", async () => {
    fetchRssMock.mockResolvedValue([
      {
        title: "Warehouse failures scrutinized after deadly port blast - nytimes.com",
        link: "https://news.google.com/rss/articles/nyt-2",
        source: "nytimes.com",
        pubDate: "2026-03-29T00:00:00Z",
        description: "Duplicate NYT framing",
      },
      {
        title: "Deadly port blast probe turns to warehouse safety - Reuters",
        link: "https://www.reuters.com/world/europe/port-blast-probe",
        source: "Reuters",
        pubDate: "2026-03-29T01:00:00Z",
        description: "Reuters framing",
      },
    ]);

    const service = new BiasComparisonService({
      aiProvider,
      cacheStore,
    });

    const response = await service.compare({
      source: "CNN",
      title: "Deadly port blast investigation turns to warehouse safety failures",
      url: "https://example.com/original-story",
      knownSources: [
        {
          source: "The New York Times",
          headline: "Port blast investigation expands after warehouse failures",
          summary: "NYT seeded summary",
          url: "https://news.google.com/rss/articles/nyt-1",
        },
      ],
    });

    expect(response.otherSources.map((source) => source.source).sort()).toEqual([
      "Reuters",
      "The New York Times",
    ]);
  });

  it("propagates multiple search variants and global feeds into more distinct sources", async () => {
    fetchRssMock
      .mockResolvedValueOnce([
        {
          title: "Port blast investigation focuses on warehouse failures - BBC",
          link: "https://news.google.com/rss/articles/source-bbc",
          source: "BBC",
          pubDate: "2026-03-29T00:00:00Z",
          description: "BBC framing",
        },
      ])
      .mockResolvedValueOnce([
        {
          title: "Warehouse oversight examined after deadly port blast - Reuters",
          link: "https://news.google.com/rss/articles/source-reuters",
          source: "Reuters",
          pubDate: "2026-03-29T01:00:00Z",
          description: "Reuters framing",
        },
      ])
      .mockResolvedValueOnce([
        {
          title: "Deadly port blast probe turns to safety failures - AP News",
          link: "https://news.google.com/rss/articles/source-ap",
          source: "AP News",
          pubDate: "2026-03-29T02:00:00Z",
          description: "AP framing",
        },
      ])
      .mockResolvedValueOnce([]);

    getGlobalFeedItemsMock.mockResolvedValue([
      {
        title: "Deadly port blast probe expands as officials review warehouse safeguards",
        link: "https://www.theguardian.com/world/2026/mar/29/port-blast-probe",
        source: "The Guardian",
        pubDate: "2026-03-29T03:00:00Z",
        description: "Guardian framing",
      },
      {
        title: "Unrelated markets story",
        link: "https://www.theguardian.com/business/2026/mar/29/unrelated-markets-story",
        source: "The Guardian",
        pubDate: "2026-03-29T03:30:00Z",
        description: "Should be filtered out",
      },
    ]);

    const service = new BiasComparisonService({
      aiProvider,
      cacheStore,
    });

    const response = await service.compare({
      source: "CNN",
      title: "Deadly port blast investigation turns to warehouse safety failures",
      url: "https://example.com/original-story",
    });

    expect(fetchRssMock.mock.calls.length).toBeGreaterThan(1);
    expect(response.otherSources.map((source) => source.source).sort()).toEqual([
      "AP News",
      "BBC",
      "Reuters",
      "The Guardian",
    ]);
  });

  it("fills bullet summary and agreement sections from fallback when AI returns blanks", async () => {
    vi.mocked(aiProvider.generateComparison).mockResolvedValueOnce({
      storyTitle: "Neutral story",
      bulletSummary: [],
      originalSummary: "",
      sourceSummaries: [],
      originalBias: { emphasizedDetails: [], overallOpinion: "" },
      sourceBiases: [],
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
