import { describe, expect, it, vi } from "vitest";

import type { NewsProvider, ProviderNewsArticle } from "../src/providers/newsProvider";
import { NewsRepository } from "../src/repositories/newsRepository";
import { IngestionService } from "../src/services/ingestionService";

const createArticle = (overrides: Partial<ProviderNewsArticle> = {}): ProviderNewsArticle => ({
  publishedAt: "2026-03-28T12:00:00Z",
  rawId: "raw-1",
  source: "Example News",
  title: "Example article",
  url: "https://example.com/default",
  ...overrides,
});

const createRepository = () =>
  ({
    completeIngestionRun: vi.fn(async () => undefined),
    createIngestionRun: vi.fn(async () => 123),
    markCountryStaleIfExpired: vi.fn(async () => undefined),
    replaceCountryData: vi.fn(async () => undefined),
  }) as unknown as NewsRepository;

describe("IngestionService", () => {
  it("writes a deduped five-article snapshot for a successful country ingest", async () => {
    const repository = createRepository();
    const provider: NewsProvider = {
      fetchCountryNews: vi.fn(async () => [
        createArticle({
          publishedAt: "2026-03-28T12:00:00Z",
          rawId: "raw-a",
          title: "Article A",
          url: "https://example.com/a",
        }),
        createArticle({
          publishedAt: "2026-03-28T11:00:00Z",
          rawId: "raw-a-dup",
          title: "Article A duplicate",
          url: "https://example.com/a",
        }),
        createArticle({
          publishedAt: "2026-03-28T10:00:00Z",
          rawId: "raw-b",
          title: "Article B",
          url: "https://example.com/b",
        }),
        createArticle({
          publishedAt: "2026-03-28T09:00:00Z",
          rawId: "raw-c",
          title: "Article C",
          url: "https://example.com/c",
        }),
        createArticle({
          publishedAt: "2026-03-28T08:00:00Z",
          rawId: "raw-d",
          title: "Article D",
          url: "https://example.com/d",
        }),
        createArticle({
          publishedAt: "2026-03-28T07:00:00Z",
          rawId: "raw-e",
          title: "Article E",
          url: "https://example.com/e",
        }),
      ]),
      name: "gdelt",
    };
    const service = new IngestionService({
      provider,
      repository,
    });

    const response = await service.ingest({ countryCode: "US" });

    expect(response.countriesAttempted).toBe(1);
    expect(response.countriesSucceeded).toBe(1);
    expect(repository.replaceCountryData).toHaveBeenCalledTimes(1);
    const replaceArgs = vi.mocked(repository.replaceCountryData).mock.calls[0][0];
    expect(replaceArgs.countryCode).toBe("US");
    expect(replaceArgs.provider).toBe("gdelt");
    expect(replaceArgs.articles).toHaveLength(5);
    expect(replaceArgs.articles.map((article) => article.url)).toEqual([
      "https://example.com/a",
      "https://example.com/b",
      "https://example.com/c",
      "https://example.com/d",
      "https://example.com/e",
    ]);
  });

  it("keeps the existing snapshot and only checks staleness when the provider returns no articles", async () => {
    const repository = createRepository();
    const provider: NewsProvider = {
      fetchCountryNews: vi.fn(async () => []),
      name: "gdelt",
    };
    const service = new IngestionService({
      provider,
      repository,
    });

    const response = await service.ingest({ countryCode: "US" });

    expect(response.countriesSucceeded).toBe(0);
    expect(repository.replaceCountryData).not.toHaveBeenCalled();
    expect(repository.markCountryStaleIfExpired).toHaveBeenCalledTimes(1);
  });

  it("marks the country stale when the provider fails", async () => {
    const repository = createRepository();
    const provider: NewsProvider = {
      fetchCountryNews: vi.fn(async () => {
        throw new Error("provider exploded");
      }),
      name: "gdelt",
    };
    const service = new IngestionService({
      provider,
      repository,
    });

    const response = await service.ingest({ countryCode: "US" });

    expect(response.status).toBe("failed");
    expect(repository.replaceCountryData).not.toHaveBeenCalled();
    expect(repository.markCountryStaleIfExpired).toHaveBeenCalledTimes(1);
    expect(repository.completeIngestionRun).toHaveBeenCalledWith(
      123,
      expect.objectContaining({
        countriesSucceeded: 0,
        status: "failed",
      }),
    );
  });
});
