import { describe, expect, it, vi } from "vitest";

import type { CacheStore } from "../src/lib/redis";
import { NewsRepository } from "../src/repositories/newsRepository";
import { SentimentService } from "../src/services/sentimentService";

const createCacheStore = (): CacheStore => ({
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  getJson: vi.fn().mockResolvedValue(null),
  ping: vi.fn().mockResolvedValue(false),
  setJson: vi.fn().mockResolvedValue(undefined),
});

describe("SentimentService", () => {
  it("builds global sentiment from stored snapshots only", async () => {
    const repository = {
      getGlobalSnapshots: vi.fn(async () => [
        {
          articleCount: 5,
          countryCode: "US",
          countryName: "United States",
          isStale: false,
          provider: "gdelt",
          refreshedAt: "2026-03-28T12:00:00.000Z",
          sentimentLabel: "neutral" as const,
          sentimentScore: 0.1,
          sourceCount: 3,
        },
        {
          articleCount: 4,
          countryCode: "BR",
          countryName: "Brazil",
          isStale: true,
          provider: "gdelt",
          refreshedAt: "2026-03-28T12:00:00.000Z",
          sentimentLabel: "positive" as const,
          sentimentScore: 0.3,
          sourceCount: 2,
        },
      ]),
      getLatestSnapshotUpdate: vi.fn(async () => "2026-03-28T12:00:00.000Z"),
    } as unknown as NewsRepository;

    const service = new SentimentService({
      cacheStore: createCacheStore(),
      repository,
    });

    const response = await service.getGlobalSentiment();

    expect(response.cached).toBe(false);
    expect(response.updatedAt).toBe("2026-03-28T12:00:00.000Z");
    expect(response.countries).toEqual([
      expect.objectContaining({
        articleCount: 5,
        countryCode: "US",
      }),
    ]);
    expect(repository.getGlobalSnapshots).toHaveBeenCalledTimes(1);
  });
});
