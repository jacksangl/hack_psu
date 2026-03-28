import { z } from "zod";

export const sentimentLabelSchema = z.enum(["negative", "neutral", "positive"]);

export const articleSentimentSchema = z.object({
  score: z.number().min(-1).max(1),
  label: sentimentLabelSchema,
});

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export const isoDateSchema = z
  .string()
  .regex(isoDatePattern, "Expected a date in YYYY-MM-DD format.")
  .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date value.");

export const countryCodeSchema = z
  .string()
  .trim()
  .regex(/^[a-zA-Z]{2}$/, "Expected a two-letter ISO country code.")
  .transform((value) => value.toUpperCase());

export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
