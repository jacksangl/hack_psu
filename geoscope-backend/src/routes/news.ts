import { Router } from "express";

import { createNewsController } from "../controllers/newsController";
import { validate } from "../middleware/validate";
import { newsParamsSchema, newsQuerySchema } from "../schemas/newsSchemas";
import { NewsService } from "../services/newsService";

export const createNewsRouter = (newsService: NewsService): Router => {
  const router = Router();

  router.get(
    "/news/:countryCode",
    validate({
      params: newsParamsSchema,
      query: newsQuerySchema,
    }),
    createNewsController(newsService),
  );

  return router;
};
