import { describe, expect, it, vi } from "vitest";
import type { Response } from "express";

import { createHealthController } from "../src/controllers/healthController";
import type { CacheStore } from "../src/lib/redis";

const createCacheStoreMock = (redisReachable: boolean): CacheStore => ({
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  getJson: vi.fn().mockResolvedValue(null),
  setJson: vi.fn().mockResolvedValue(undefined),
  ping: vi.fn().mockResolvedValue(redisReachable),
});

const createResponse = () => {
  const json = vi.fn();

  return {
    json,
  } as unknown as Response;
};

describe("createHealthController", () => {
  it("returns ok when redis is reachable", async () => {
    const controller = createHealthController(createCacheStoreMock(true));
    const response = createResponse();

    await controller({} as never, response, vi.fn());

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        redisReachable: true,
        status: "ok",
      }),
    );
  });

  it("returns degraded when redis is unavailable", async () => {
    const controller = createHealthController(createCacheStoreMock(false));
    const response = createResponse();

    await controller({} as never, response, vi.fn());

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        redisReachable: false,
        status: "degraded",
      }),
    );
  });
});
