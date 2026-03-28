import type { RequestHandler } from "express";
import { z } from "zod";

import type { CacheStore } from "../lib/redis";

const healthResponseSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  uptime: z.number().nonnegative(),
  timestamp: z.string().datetime(),
  redisReachable: z.boolean(),
});

export const createHealthController = (cacheStore: CacheStore): RequestHandler => async (_req, res, next) => {
  try {
    const redisReachable = await cacheStore.ping();

    res.json(
      healthResponseSchema.parse({
        status: redisReachable ? "ok" : "degraded",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        redisReachable,
      }),
    );
  } catch (error) {
    next(error);
  }
};
