import { Router } from "express";

import { createHealthController } from "../controllers/healthController";
import type { CacheStore } from "../lib/redis";

export const createHealthRouter = (cacheStore: CacheStore): Router => {
  const router = Router();

  router.get("/health", createHealthController(cacheStore));

  return router;
};
