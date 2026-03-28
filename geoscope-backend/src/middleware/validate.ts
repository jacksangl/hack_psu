import type { RequestHandler } from "express";
import type { ZodTypeAny } from "zod";

interface ValidationTargets {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
}

export interface ValidatedRequestData {
  body?: unknown;
  params?: unknown;
  query?: unknown;
}

export const validate = (targets: ValidationTargets): RequestHandler => (req, res, next) => {
  const validated: ValidatedRequestData = {};

  try {
    if (targets.params) {
      validated.params = targets.params.parse(req.params);
    }

    if (targets.query) {
      validated.query = targets.query.parse(req.query);
    }

    if (targets.body) {
      validated.body = targets.body.parse(req.body);
    }

    res.locals.validated = validated;
    next();
  } catch (error) {
    next(error);
  }
};
