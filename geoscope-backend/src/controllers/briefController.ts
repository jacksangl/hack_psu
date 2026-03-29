import type { RequestHandler } from "express";
import { z } from "zod";

import type { ValidatedRequestData } from "../middleware/validate";
import { briefResponseSchema } from "../schemas/briefSchemas";
import { newsParamsSchema } from "../schemas/newsSchemas";
import { BriefService } from "../services/briefService";

type BriefParams = z.infer<typeof newsParamsSchema>;

export const createBriefController = (briefService: BriefService): RequestHandler => async (_req, res, next) => {
  try {
    const validated = res.locals.validated as ValidatedRequestData;
    const params = validated.params as BriefParams;

    const response = await briefService.getCountryBrief(params.countryCode);
    res.set("Cache-Control", "public, max-age=120, stale-while-revalidate=300");
    res.json(briefResponseSchema.parse(response));
  } catch (error) {
    next(error);
  }
};
