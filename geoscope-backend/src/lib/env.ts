import { z } from "zod";

export const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535),
  NODE_ENV: z.enum(["development", "test", "production"]),
  REDIS_URL: z.string().url().optional(),
  DATABASE_URL: z.string().min(1),
  INGEST_API_KEY: z.string().min(1),
  NEWS_API_KEY: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

export const parseEnv = (input: NodeJS.ProcessEnv = process.env): Env => envSchema.parse(input);
