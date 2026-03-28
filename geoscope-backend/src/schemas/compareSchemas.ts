import { z } from "zod";

import { briefResponseSchema } from "./briefSchemas";
import { countryCodeSchema, sentimentLabelSchema } from "./common";

export const compareParamsSchema = z.object({
  countryA: countryCodeSchema,
  countryB: countryCodeSchema,
});

const compareSideSchema = briefResponseSchema.omit({
  cached: true,
});

export const compareResponseSchema = z.object({
  left: compareSideSchema.extend({
    countryCode: countryCodeSchema,
  }),
  right: compareSideSchema.extend({
    countryCode: countryCodeSchema,
  }),
  comparison: z.object({
    sharedTopics: z.array(z.string()),
    sentimentContrast: z.object({
      left: sentimentLabelSchema,
      right: sentimentLabelSchema,
      delta: z.number().min(-2).max(2),
    }),
    actorOverlap: z.array(z.string()),
  }),
  cached: z.boolean(),
});
