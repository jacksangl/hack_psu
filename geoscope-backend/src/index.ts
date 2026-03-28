import dotenv from "dotenv";

import { createApp } from "./app";
import { parseEnv } from "./lib/env";
import { logger } from "./lib/logger";
import { createCacheStore } from "./lib/redis";
import { GdeltProvider } from "./providers/gdeltProvider";
import { NewsApiProvider } from "./providers/newsApiProvider";
import { OpenAIBriefProvider } from "./providers/openaiBriefProvider";
import { BriefService } from "./services/briefService";
import { CompareService } from "./services/compareService";
import { NewsService } from "./services/newsService";
import { SentimentService } from "./services/sentimentService";

dotenv.config();

const start = async (): Promise<void> => {
  const env = parseEnv();
  const cacheStore = createCacheStore(env.REDIS_URL);

  await cacheStore.connect();

  const newsService = new NewsService({
    primaryProvider: new NewsApiProvider({ apiKey: env.NEWS_API_KEY }),
    secondaryProvider: new GdeltProvider(),
    cacheStore,
  });

  const briefService = new BriefService({
    aiProvider: new OpenAIBriefProvider({ apiKey: env.OPENAI_API_KEY }),
    cacheStore,
    newsService,
  });

  const sentimentService = new SentimentService({
    cacheStore,
    newsService,
  });

  const compareService = new CompareService({
    briefService,
    cacheStore,
    newsService,
  });

  const app = createApp({
    cacheStore,
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
