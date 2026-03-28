import { createHash } from "node:crypto";

import type { ProviderNewsArticle } from "../providers/newsProvider";
import type { Article } from "../types/article";
import { getCountryCentroid } from "./countryCodeMap";
import { computeArticleSentiment } from "./sentiment";

interface NormalizeArticlesOptions {
  countryCode: string;
  countryName: string;
  requestedTopic?: string;
}

const topicMatchers: Array<{ topic: string; pattern: RegExp }> = [
  { topic: "Politics", pattern: /\b(election|government|minister|parliament|president|policy)\b/i },
  { topic: "Conflict", pattern: /\b(attack|conflict|war|military|strike|violence)\b/i },
  { topic: "Economy", pattern: /\b(economy|inflation|market|trade|budget|growth)\b/i },
  { topic: "Business", pattern: /\b(company|business|industry|investment|merger|startup)\b/i },
  { topic: "Climate", pattern: /\b(climate|weather|storm|flood|wildfire|drought)\b/i },
  { topic: "Health", pattern: /\b(health|hospital|disease|virus|outbreak|medicine)\b/i },
  { topic: "Technology", pattern: /\b(technology|ai|software|cyber|data|chip)\b/i },
  { topic: "Sports", pattern: /\b(sport|football|soccer|basketball|cricket|tournament)\b/i },
  { topic: "Culture", pattern: /\b(culture|festival|film|music|art|museum)\b/i },
  { topic: "Diplomacy", pattern: /\b(diplomacy|summit|treaty|embassy|sanction|ceasefire)\b/i },
];

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
  const topics = new Set<string>();

  if (requestedTopic) {
    topics.add(requestedTopic.trim());
  }

  for (const topic of article.topics ?? []) {
    if (topic.trim()) {
      topics.add(topic.trim());
    }
  }

  const haystack = [article.title, article.description].filter(Boolean).join(" ");

  for (const matcher of topicMatchers) {
    if (matcher.pattern.test(haystack)) {
      topics.add(matcher.topic);
    }
  }

  return Array.from(topics).slice(0, 5);
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
    locationName: sanitizeText(article.locationName) ?? centroid?.locationName ?? options.countryName,
  };
};

export const normalizeArticles = (
  articles: ProviderNewsArticle[],
  options: NormalizeArticlesOptions,
): Article[] =>
  articles.map((article) => normalizeArticle(article, options));
