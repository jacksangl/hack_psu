import { Router } from "express";

import { createAdminIngestController } from "../controllers/adminIngestController";
import { validate } from "../middleware/validate";
import { ingestRequestSchema } from "../schemas/adminSchemas";
import { IngestionService } from "../services/ingestionService";

export const createAdminRouter = (ingestionService: IngestionService, ingestApiKey: string): Router => {
  const router = Router();

  router.post(
    "/admin/ingest",
    validate({
      body: ingestRequestSchema.optional(),
      query: ingestRequestSchema.optional(),
    }),
    createAdminIngestController(ingestionService, ingestApiKey),
  );

  return router;
};
