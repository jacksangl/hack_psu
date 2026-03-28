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
    res.json(globalSentimentResponseSchema.parse(response));
  } catch (error) {
    next(error);
  }
};
