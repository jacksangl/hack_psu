import { z } from "zod";

import { articleSentimentSchema, countryCodeSchema, isoDateSchema } from "./common";

export const newsParamsSchema = z.object({
  countryCode: countryCodeSchema,
});

export const newsQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).default(20),
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
    topic: z.string().trim().min(1).max(50).optional(),
  })
  .refine(
    (value) => {
      if (!value.from || !value.to) {
        return true;
      }

      return new Date(value.from) <= new Date(value.to);
    },
    {
      message: "`from` must be earlier than or equal to `to`.",
      path: ["from"],
    },
  );

export const articleSchema = z.object({
  id: z.string(),
  countryCode: z.string(),
  countryName: z.string(),
  title: z.string(),
  source: z.string(),
  url: z.string().url(),
  publishedAt: z.string().datetime(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  sentiment: articleSentimentSchema,
  topics: z.array(z.string()),
  locationName: z.string().nullable(),
});

export const newsResponseSchema = z.object({
  countryCode: countryCodeSchema,
  countryName: z.string(),
  articles: z.array(articleSchema),
  total: z.number().int().min(0),
  cached: z.boolean(),
});
