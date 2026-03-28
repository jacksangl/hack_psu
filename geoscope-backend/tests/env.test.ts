import { describe, expect, it } from "vitest";

import { parseEnv } from "../src/lib/env";

describe("parseEnv", () => {
  it("parses a valid environment", () => {
    const env = parseEnv({
      DATABASE_URL: "postgres://postgres:postgres@localhost:5432/geoscope",
      GEMINI_API_KEY: "gemini-key",
      INGEST_API_KEY: "ingest-key",
      PORT: "3000",
      NODE_ENV: "development",
      REDIS_URL: "redis://localhost:6379",
      NEWS_API_KEY: "news-key",
    });

    expect(env.PORT).toBe(3000);
    expect(env.NODE_ENV).toBe("development");
  });

  it("throws for invalid config", () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: "",
        GEMINI_API_KEY: "",
        INGEST_API_KEY: "",
        PORT: "0",
        NODE_ENV: "demo",
        REDIS_URL: "not-a-url",
        NEWS_API_KEY: "",
      } as NodeJS.ProcessEnv),
    ).toThrow();
  });
});
