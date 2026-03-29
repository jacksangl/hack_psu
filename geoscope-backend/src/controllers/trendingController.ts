import type { RequestHandler } from "express";

import { TrendingService } from "../services/trendingService";

export const createTrendingController = (trendingService: TrendingService): RequestHandler => async (
  req,
  res,
  next,
) => {
  try {
    const category = typeof req.query.category === "string" ? req.query.category : undefined;
    const response = await trendingService.getTrending(category);
    res.json(response);
  } catch (error) {
    next(error);
  }
};
