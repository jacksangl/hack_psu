import { z } from "zod";

import { countryCodeSchema, sentimentLabelSchema } from "./common";

export const globalSentimentEntrySchema = z.object({
  countryCode: countryCodeSchema,
  countryName: z.string(),
  sentimentScore: z.number().min(-1).max(1),
  sentimentLabel: sentimentLabelSchema,
  articleCount: z.number().int().min(0),
});

export const globalSentimentResponseSchema = z.object({
  updatedAt: z.string().datetime(),
  countries: z.array(globalSentimentEntrySchema),
  cached: z.boolean(),
});
