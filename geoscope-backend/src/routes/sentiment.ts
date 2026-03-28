import { Router } from "express";

import { createSentimentController } from "../controllers/sentimentController";
import { SentimentService } from "../services/sentimentService";

export const createSentimentRouter = (sentimentService: SentimentService): Router => {
  const router = Router();

  router.get("/sentiment/global", createSentimentController(sentimentService));

  return router;
};
