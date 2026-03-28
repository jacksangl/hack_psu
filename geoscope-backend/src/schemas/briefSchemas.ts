import { z } from "zod";

import { countryCodeSchema, sentimentLabelSchema } from "./common";

export const briefDraftSchema = z.object({
  summary: z.string().trim().min(1).max(1200),
  sentiment: sentimentLabelSchema,
  keyActors: z.array(z.string().trim().min(1)).max(5),
  topicTags: z.array(z.string().trim().min(1)).max(5),
});

export const briefResponseSchema = z.object({
  countryCode: countryCodeSchema,
  summary: z.string(),
  sentiment: sentimentLabelSchema,
  keyActors: z.array(z.string()),
  topicTags: z.array(z.string()),
  articleCount: z.number().int().min(0),
  cached: z.boolean(),
});
