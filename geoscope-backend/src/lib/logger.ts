import type { NextFunction, Request, RequestHandler, Response } from "express";

type LogLevel = "info" | "warn" | "error";

const log = (level: LogLevel, message: string, meta?: unknown): void => {
  const payload = {
    level,
    message,
    meta,
    timestamp: new Date().toISOString(),
  };

  const serialized = JSON.stringify(payload);

  if (level === "error") {
    console.error(serialized);
    return;
  }

  console.log(serialized);
};

export const logger = {
  info: (message: string, meta?: unknown) => log("info", message, meta),
  warn: (message: string, meta?: unknown) => log("warn", message, meta),
  error: (message: string, meta?: unknown) => log("error", message, meta),
};

export const requestLogger: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const startedAt = Date.now();

  res.on("finish", () => {
    logger.info("request completed", {
      durationMs: Date.now() - startedAt,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
    });
  });

  next();
};
