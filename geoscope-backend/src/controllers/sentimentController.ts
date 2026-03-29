import type { RequestHandler } from "express";

import { globalSentimentResponseSchema } from "../schemas/sentimentSchemas";
import { SentimentService } from "../services/sentimentService";

export const createSentimentController = (sentimentService: SentimentService): RequestHandler => async (
  _req,
  res,
  next,
) => {
  try {
    const response = await sentimentService.getGlobalSentiment();
    res.set("Cache-Control", "public, max-age=180, stale-while-revalidate=600");
    res.json(globalSentimentResponseSchema.parse(response));
  } catch (error) {
    next(error);
  }
};
