import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createApp } from "../src/app";
import type { CacheStore } from "../src/lib/redis";
import { BriefService } from "../src/services/briefService";
import { CompareService } from "../src/services/compareService";
import { NewsService } from "../src/services/newsService";
import { SentimentService } from "../src/services/sentimentService";

const createCacheStoreMock = (redisReachable: boolean): CacheStore => ({
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  getJson: vi.fn().mockResolvedValue(null),
  setJson: vi.fn().mockResolvedValue(undefined),
  ping: vi.fn().mockResolvedValue(redisReachable),
});

const createAppWithMocks = (redisReachable: boolean) =>
  createApp({
    cacheStore: createCacheStoreMock(redisReachable),
    newsService: {
      getCountryNews: vi.fn(),
    } as unknown as NewsService,
    briefService: {
      getCountryBrief: vi.fn(),
    } as unknown as BriefService,
    sentimentService: {
      getGlobalSentiment: vi.fn(),
    } as unknown as SentimentService,
    compareService: {
      compare: vi.fn(),
    } as unknown as CompareService,
  });

describe("GET /api/health", () => {
  it("returns ok when redis is reachable", async () => {
    const app = createAppWithMocks(true);
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.redisReachable).toBe(true);
  });

  it("returns degraded when redis is unavailable", async () => {
    const app = createAppWithMocks(false);
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("degraded");
    expect(response.body.redisReachable).toBe(false);
  });
});
