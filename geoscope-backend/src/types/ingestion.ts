export interface IngestionRequest {
  countryCode?: string;
}

export interface IngestionResponse {
  countriesAttempted: number;
  countriesSucceeded: number;
  finishedAt: string;
  runId: number;
  startedAt: string;
  status: "completed" | "failed";
}
