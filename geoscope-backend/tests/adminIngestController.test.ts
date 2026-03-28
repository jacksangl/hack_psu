import { describe, expect, it, vi } from "vitest";

import type { Request, Response } from "express";

import { createAdminIngestController } from "../src/controllers/adminIngestController";
import { AppError } from "../src/lib/errors";
import { IngestionService } from "../src/services/ingestionService";

const createResponse = () => {
  const json = vi.fn();

  return {
    json,
    locals: {
      validated: {},
    },
  } as unknown as Response;
};

describe("createAdminIngestController", () => {
  it("rejects requests with an invalid ingest key", async () => {
    const ingestionService = {
      ingest: vi.fn(),
    } as unknown as IngestionService;
    const handler = createAdminIngestController(ingestionService, "expected-key");
    const next = vi.fn();

    await handler(
      {
        header: vi.fn(() => "wrong-key"),
      } as unknown as Request,
      createResponse(),
      next,
    );

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect(ingestionService.ingest).not.toHaveBeenCalled();
  });

  it("passes a requested countryCode through to ingestion", async () => {
    const ingestionService = {
      ingest: vi.fn(async () => ({
        countriesAttempted: 1,
        countriesSucceeded: 1,
        finishedAt: "2026-03-28T12:05:00.000Z",
        runId: 42,
        startedAt: "2026-03-28T12:00:00.000Z",
        status: "completed" as const,
      })),
    } as unknown as IngestionService;
    const handler = createAdminIngestController(ingestionService, "expected-key");
    const response = createResponse();

    response.locals.validated = {
      query: {
        countryCode: "US",
      },
    };

    await handler(
      {
        header: vi.fn(() => "expected-key"),
      } as unknown as Request,
      response,
      vi.fn(),
    );

    expect(ingestionService.ingest).toHaveBeenCalledWith({
      countryCode: "US",
    });
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        countriesAttempted: 1,
        runId: 42,
      }),
    );
  });
});
