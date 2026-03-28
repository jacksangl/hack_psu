import type { RequestHandler } from "express";
import { z } from "zod";

import type { ValidatedRequestData } from "../middleware/validate";
import { compareParamsSchema, compareResponseSchema } from "../schemas/compareSchemas";
import { CompareService } from "../services/compareService";

type CompareParams = z.infer<typeof compareParamsSchema>;

export const createCompareController = (compareService: CompareService): RequestHandler => async (
  _req,
  res,
  next,
) => {
  try {
    const validated = res.locals.validated as ValidatedRequestData;
    const params = validated.params as CompareParams;

    const response = await compareService.compare(params.countryA, params.countryB);
    res.json(compareResponseSchema.parse(response));
  } catch (error) {
    next(error);
  }
};
