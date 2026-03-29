import type { RequestHandler } from "express";

import { AppError } from "../lib/errors";
import { BiasComparisonService } from "../services/biasComparisonService";
import type { SourceCoverage } from "../types/biasComparison";

export const createBiasComparisonController = (biasComparisonService: BiasComparisonService): RequestHandler => async (
  req,
  res,
  next,
) => {
  try {
    const title = typeof req.query.title === "string" ? req.query.title : "";
    const source = typeof req.query.source === "string" ? req.query.source : "";
    const url = typeof req.query.url === "string" ? req.query.url : "";
    const description = typeof req.query.description === "string" ? req.query.description : null;

    let knownSources: SourceCoverage[] | undefined;
    if (typeof req.query.knownSources === "string") {
      try {
        const parsed = JSON.parse(req.query.knownSources);
        if (Array.isArray(parsed)) {
          knownSources = parsed;
        }
      } catch {
        // ignore malformed JSON, fall back to search
      }
    }

    if (!title || !url) {
      throw new AppError(400, "BAD_REQUEST", "Query params 'title' and 'url' are required.");
    }

    const response = await biasComparisonService.compare({ title, source, url, description, knownSources });
    res.json(response);
  } catch (error) {
    next(error);
  }
};
