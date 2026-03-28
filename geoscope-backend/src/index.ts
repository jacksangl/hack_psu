import dotenv from "dotenv";

import { createApp } from "./app";
import { Database } from "./lib/db";
import { parseEnv } from "./lib/env";
import { logger } from "./lib/logger";
import { runMigrations } from "./lib/migrations";
import { createCacheStore } from "./lib/redis";
import { GdeltProvider } from "./providers/gdeltProvider";
import { GeminiBriefProvider } from "./providers/geminiBriefProvider";
import { NewsRepository } from "./repositories/newsRepository";
import { BriefService } from "./services/briefService";
import { CompareService } from "./services/compareService";
import { IngestionService } from "./services/ingestionService";
import { NewsService } from "./services/newsService";
import { SentimentService } from "./services/sentimentService";

dotenv.config();

const start = async (): Promise<void> => {
  const env = parseEnv();
  const cacheStore = createCacheStore(env.REDIS_URL);
  const database = new Database(env.DATABASE_URL);

  await cacheStore.connect();
  await runMigrations(database);
  const newsRepository = new NewsRepository(database);

  const newsService = new NewsService({
    cacheStore,
    repository: newsRepository,
  });

  const briefService = new BriefService({
    aiProvider: new GeminiBriefProvider({ apiKey: env.GEMINI_API_KEY }),
    cacheStore,
    newsService,
  });

  const sentimentService = new SentimentService({
    cacheStore,
    repository: newsRepository,
  });

  const compareService = new CompareService({
    briefService,
    cacheStore,
    newsService,
  });

  const ingestionService = new IngestionService({
    provider: new GdeltProvider(),
    repository: newsRepository,
  });

  const app = createApp({
    cacheStore,
    ingestApiKey: env.INGEST_API_KEY,
    ingestionService,
    newsService,
    briefService,
    sentimentService,
    compareService,
  });

  const server = app.listen(env.PORT, () => {
    logger.info("server started", {
      environment: env.NODE_ENV,
      port: env.PORT,
    });
  });

  const shutdown = async (): Promise<void> => {
    server.close(async () => {
      await cacheStore.disconnect();
      await database.close();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => {
    void shutdown();
  });

  process.on("SIGTERM", () => {
    void shutdown();
  });
};

void start();
