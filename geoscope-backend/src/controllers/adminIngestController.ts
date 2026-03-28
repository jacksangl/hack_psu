import type { RequestHandler } from "express";
import { z } from "zod";

import { AppError } from "../lib/errors";
import type { ValidatedRequestData } from "../middleware/validate";
import { ingestRequestSchema, ingestResponseSchema } from "../schemas/adminSchemas";
import { IngestionService } from "../services/ingestionService";

type IngestRequestData = z.infer<typeof ingestRequestSchema>;

export const createAdminIngestController = (
  ingestionService: IngestionService,
  ingestApiKey: string,
): RequestHandler => async (req, res, next) => {
  try {
    if (req.header("X-Ingest-Key") !== ingestApiKey) {
      throw new AppError(401, "UNAUTHORIZED", "Invalid ingest key.");
    }

    const validated = res.locals.validated as ValidatedRequestData;
    const body = (validated.body ?? {}) as IngestRequestData;
    const query = (validated.query ?? {}) as IngestRequestData;
    const response = await ingestionService.ingest({
      countryCode: body.countryCode ?? query.countryCode,
    });

    res.json(ingestResponseSchema.parse(response));
  } catch (error) {
    next(error);
  }
};
