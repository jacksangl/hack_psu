import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";

import type { CacheStore } from "./lib/redis";
import { requestLogger } from "./lib/logger";
import { errorHandler } from "./middleware/errorHandler";
import { notFound } from "./middleware/notFound";
import { apiRateLimiter } from "./middleware/rateLimiter";
import { createAdminRouter } from "./routes/admin";
import { createBriefRouter } from "./routes/brief";
import { createCompareRouter } from "./routes/compare";
import { createHealthRouter } from "./routes/health";
import { createNewsRouter } from "./routes/news";
import { createSentimentRouter } from "./routes/sentiment";
import { BriefService } from "./services/briefService";
import { CompareService } from "./services/compareService";
import { IngestionService } from "./services/ingestionService";
import { NewsService } from "./services/newsService";
import { SentimentService } from "./services/sentimentService";

export interface AppDependencies {
  cacheStore: CacheStore;
  ingestApiKey: string;
  ingestionService: IngestionService;
  newsService: NewsService;
  briefService: BriefService;
  sentimentService: SentimentService;
  compareService: CompareService;
}

export const createApp = (dependencies: AppDependencies): Express => {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(requestLogger);
  app.use(apiRateLimiter);

  app.use("/api", createHealthRouter(dependencies.cacheStore));
  app.use("/api", createAdminRouter(dependencies.ingestionService, dependencies.ingestApiKey));
  app.use("/api", createNewsRouter(dependencies.newsService));
  app.use("/api", createBriefRouter(dependencies.briefService));
  app.use("/api", createSentimentRouter(dependencies.sentimentService));
  app.use("/api", createCompareRouter(dependencies.compareService));

  app.use(notFound);
  app.use(errorHandler);

  return app;
};
