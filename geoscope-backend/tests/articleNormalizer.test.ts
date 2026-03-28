import { describe, expect, it } from "vitest";

import { normalizeArticle } from "../src/utils/articleNormalizer";

describe("normalizeArticle", () => {
  it("normalizes a NewsAPI-like article and falls back to country centroid", () => {
    const article = normalizeArticle(
      {
        title: "Government announces climate recovery plan",
        source: "Example News",
        url: "https://example.com/article-1",
        publishedAt: "2026-03-28T12:00:00Z",
        description: "Officials said the plan aims to support long-term growth.",
      },
      {
        countryCode: "US",
        countryName: "United States",
        requestedTopic: "Climate",
      },
    );

    expect(article.id).toBeTruthy();
    expect(article.latitude).toBeCloseTo(37.0902);
    expect(article.longitude).toBeCloseTo(-95.7129);
    expect(article.locationName).toBe("United States");
    expect(article.topics).toContain("Climate");
    expect(article.sentiment.label).toBe("positive");
  });

  it("preserves provider geo coordinates when present", () => {
    const article = normalizeArticle(
      {
        title: "Strike disrupts logistics network",
        source: "Example Wire",
        url: "https://example.com/article-2",
        publishedAt: "2026-03-28T12:00:00Z",
        description: "The strike added more risk for exporters.",
        latitude: -26.2041,
        longitude: 28.0473,
        locationName: "Johannesburg",
      },
      {
        countryCode: "ZA",
        countryName: "South Africa",
      },
    );

    expect(article.latitude).toBeCloseTo(-26.2041);
    expect(article.longitude).toBeCloseTo(28.0473);
    expect(article.locationName).toBe("Johannesburg");
    expect(article.sentiment.label).toBe("negative");
  });
});
