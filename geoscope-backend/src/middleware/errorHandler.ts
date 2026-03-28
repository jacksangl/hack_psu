import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import { AppError, toErrorPayload } from "../lib/errors";
import { logger } from "../lib/logger";

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "BAD_REQUEST",
        message: "Request validation failed.",
        details: error.flatten(),
      },
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: toErrorPayload(error),
    });
    return;
  }

  logger.error("unhandled error", {
    message: error instanceof Error ? error.message : "unknown error",
  });

  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred.",
    },
  });
};
