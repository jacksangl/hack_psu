import { z } from "zod";

import { countryCodeSchema } from "./common";

export const ingestRequestSchema = z.object({
  countryCode: countryCodeSchema.optional(),
});

export const ingestResponseSchema = z.object({
  runId: z.number().int().positive(),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime(),
  status: z.enum(["completed", "failed"]),
  countriesAttempted: z.number().int().min(0),
  countriesSucceeded: z.number().int().min(0),
});
