import { createHash } from "node:crypto";

import type { ProviderNewsArticle } from "../providers/newsProvider";
import type { Article } from "../types/article";
import { getCountryCentroid } from "./countryCodeMap";
import { extractRelatedCountries, extractTopicsFromContent } from "./articleSignals";
import { computeArticleSentiment } from "./sentiment";

interface NormalizeArticlesOptions {
  countryCode: string;
  countryName: string;
  requestedTopic?: string;
}

const buildArticleId = (article: ProviderNewsArticle): string =>
  createHash("sha1")
    .update([article.rawId ?? "", article.url, article.title, article.publishedAt].join("|"))
    .digest("hex");

const sanitizeText = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const ensureIsoTimestamp = (value: string): string => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
};

export const extractTopics = (article: ProviderNewsArticle, requestedTopic?: string): string[] => {
  return extractTopicsFromContent({
    title: article.title,
    description: article.description,
    explicitTopics: article.topics,
    requestedTopic,
  });
};

export const normalizeArticle = (
  article: ProviderNewsArticle,
  options: NormalizeArticlesOptions,
): Article => {
  const centroid = getCountryCentroid(options.countryCode);
  const sentiment = computeArticleSentiment(article.title, article.description, article.toneScore);

  return {
    id: buildArticleId(article),
    countryCode: options.countryCode,
    countryName: options.countryName,
    title: article.title.trim(),
    source: article.source.trim(),
    url: article.url,
    publishedAt: ensureIsoTimestamp(article.publishedAt),
    description: sanitizeText(article.description),
    imageUrl: sanitizeText(article.imageUrl),
    latitude: article.latitude ?? centroid?.latitude ?? null,
    longitude: article.longitude ?? centroid?.longitude ?? null,
    sentiment,
    topics: extractTopics(article, options.requestedTopic),
    relatedCountries: extractRelatedCountries({
      countryCode: options.countryCode,
      title: article.title,
      description: article.description,
    }),
    locationName: sanitizeText(article.locationName) ?? centroid?.locationName ?? options.countryName,
  };
};

export const normalizeArticles = (
  articles: ProviderNewsArticle[],
  options: NormalizeArticlesOptions,
): Article[] =>
  articles.map((article) => normalizeArticle(article, options));
