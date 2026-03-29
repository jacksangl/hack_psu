import type { RequestHandler } from "express";

import { AppError } from "../lib/errors";
import { BiasComparisonService } from "../services/biasComparisonService";

export const createBiasComparisonController = (biasComparisonService: BiasComparisonService): RequestHandler => async (
  req,
  res,
  next,
) => {
  try {
    const title = typeof req.query.title === "string" ? req.query.title : "";
    const source = typeof req.query.source === "string" ? req.query.source : "";
    const url = typeof req.query.url === "string" ? req.query.url : "";

    if (!title || !url) {
      throw new AppError(400, "BAD_REQUEST", "Query params 'title' and 'url' are required.");
    }

    const response = await biasComparisonService.compare({ title, source, url });
    res.json(response);
  } catch (error) {
    next(error);
  }
};
