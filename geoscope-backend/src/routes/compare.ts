import { Router } from "express";

import { createCompareController } from "../controllers/compareController";
import { validate } from "../middleware/validate";
import { compareParamsSchema } from "../schemas/compareSchemas";
import { CompareService } from "../services/compareService";

export const createCompareRouter = (compareService: CompareService): Router => {
  const router = Router();

  router.get(
    "/compare/:countryA/:countryB",
    validate({
      params: compareParamsSchema,
    }),
    createCompareController(compareService),
  );

  return router;
};
