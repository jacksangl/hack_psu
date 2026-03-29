import { Router } from "express";

import { createTrendingController } from "../controllers/trendingController";
import { TrendingService } from "../services/trendingService";

export const createTrendingRouter = (trendingService: TrendingService): Router => {
  const router = Router();

  router.get("/news/trending", createTrendingController(trendingService));

  return router;
};
