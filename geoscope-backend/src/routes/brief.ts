import { Router } from "express";

import { createBriefController } from "../controllers/briefController";
import { validate } from "../middleware/validate";
import { newsParamsSchema } from "../schemas/newsSchemas";
import { BriefService } from "../services/briefService";

export const createBriefRouter = (briefService: BriefService): Router => {
  const router = Router();

  router.get(
    "/brief/:countryCode",
    validate({
      params: newsParamsSchema,
    }),
    createBriefController(briefService),
  );

  return router;
};
