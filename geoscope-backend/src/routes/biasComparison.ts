import { Router } from "express";

import { createBiasComparisonController } from "../controllers/biasComparisonController";
import { BiasComparisonService } from "../services/biasComparisonService";

export const createBiasComparisonRouter = (biasComparisonService: BiasComparisonService): Router => {
  const router = Router();

  router.get("/article/compare", createBiasComparisonController(biasComparisonService));

  return router;
};
