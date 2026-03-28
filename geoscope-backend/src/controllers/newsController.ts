import type { RequestHandler } from "express";
import { z } from "zod";

import type { ValidatedRequestData } from "../middleware/validate";
import { newsParamsSchema, newsQuerySchema, newsResponseSchema } from "../schemas/newsSchemas";
import { NewsService } from "../services/newsService";

type NewsParams = z.infer<typeof newsParamsSchema>;
type NewsQuery = z.infer<typeof newsQuerySchema>;

export const createNewsController = (newsService: NewsService): RequestHandler => async (_req, res, next) => {
  try {
    const validated = res.locals.validated as ValidatedRequestData;
    const params = validated.params as NewsParams;
    const query = validated.query as NewsQuery;

    const response = await newsService.getCountryNews({
      countryCode: params.countryCode,
      limit: query.limit,
      from: query.from,
      to: query.to,
      topic: query.topic,
    });

    res.json(newsResponseSchema.parse(response));
  } catch (error) {
    next(error);
  }
};
