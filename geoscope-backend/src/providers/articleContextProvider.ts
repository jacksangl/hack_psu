import * as cheerio from "cheerio";

import { logger } from "../lib/logger";

const ARTICLE_CONTEXT_TIMEOUT_MS = 5_000;
const ARTICLE_CONTEXT_CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_EVIDENCE_ITEMS = 4;
const MIN_EVIDENCE_LENGTH = 35;
const MAX_EVIDENCE_LENGTH = 240;

const articleContextCache = new Map<string, { context: ArticleContext; time: number }>();

const ARTICLE_BODY_SELECTORS = [
  "article p",
  "main p",
  "[role='main'] p",
  ".article-body p",
  ".article-content p",
  ".story-body p",
  ".story-content p",
  ".entry-content p",
  ".post-content p",
];

const ARTICLE_HEADING_SELECTORS = [
  "article h2",
  "article h3",
  "main h2",
  "main h3",
  "[role='main'] h2",
  "[role='main'] h3",
];

const META_DESCRIPTION_SELECTORS = [
  "meta[property='og:description']",
  "meta[name='description']",
  "meta[name='twitter:description']",
];

const NOISE_PATTERNS = [
  /^(subscribe|sign up|get the app|download the app|cookie settings|accept cookies)\b/i,
  /\b(advertisement|sponsored content|all rights reserved|newsletter)\b/i,
];

export interface ArticleContext {
  summary: string | null;
  evidence: string[];
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function uniqueNonEmpty(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const results: string[] = [];

  for (const value of values) {
    const normalized = normalizeWhitespace(value ?? "");
    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    results.push(normalized);
  }

  return results;
}

function splitIntoSentences(text: string): string[] {
  return uniqueNonEmpty(
    normalizeWhitespace(text)
      .split(/(?<=[.!?])\s+(?=[A-Z0-9"'])/g)
      .map((sentence) => sentence.trim()),
  );
}

function isUsefulEvidence(text: string): boolean {
  if (text.length < MIN_EVIDENCE_LENGTH || text.length > MAX_EVIDENCE_LENGTH) {
    return false;
  }

  return !NOISE_PATTERNS.some((pattern) => pattern.test(text));
}

function scoreEvidence(text: string): number {
  let score = 0;

  if (/\d/.test(text)) {
    score += 3;
  }

  if (/["'][^"']{4,}["']/.test(text)) {
    score += 2;
  }

  if (/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/.test(text)) {
    score += 2;
  }

  if (/\b(after|amid|because|despite|during|following|while|with)\b/i.test(text)) {
    score += 1;
  }

  if (text.length >= 60 && text.length <= 180) {
    score += 2;
  }

  if (/[,:;]/.test(text)) {
    score += 1;
  }

  return score;
}

function extractTagText($: cheerio.CheerioAPI, selector: string, limit: number): string[] {
  return $(selector)
    .slice(0, limit)
    .toArray()
    .map((element) => $(element).text())
    .map((text) => normalizeWhitespace(text))
    .filter(Boolean);
}

function extractMetaDescriptions($: cheerio.CheerioAPI): string[] {
  return uniqueNonEmpty(
    META_DESCRIPTION_SELECTORS.map((selector) => $(selector).first().attr("content") ?? null),
  );
}

function extractArticleParagraphs($: cheerio.CheerioAPI): string[] {
  const preferred = uniqueNonEmpty(
    ARTICLE_BODY_SELECTORS.flatMap((selector) =>
      extractTagText($, selector, 12),
    ),
  );

  if (preferred.length > 0) {
    return preferred;
  }

  return uniqueNonEmpty(extractTagText($, "p", 20));
}

export function extractArticleContextFromHtml(
  html: string,
  fallbackDescription: string | null = null,
): ArticleContext {
  const $ = cheerio.load(html);

  $("script, style, noscript, svg, iframe, aside, nav, footer, form").remove();

  const metaDescriptions = extractMetaDescriptions($);
  const headings = uniqueNonEmpty(
    ARTICLE_HEADING_SELECTORS.flatMap((selector) => extractTagText($, selector, 6)),
  );
  const paragraphs = extractArticleParagraphs($);

  const candidateEvidence = uniqueNonEmpty([
    fallbackDescription,
    ...metaDescriptions,
    ...headings,
    ...paragraphs.flatMap((paragraph) => splitIntoSentences(paragraph)),
  ]);

  const evidence = candidateEvidence
    .filter((text) => isUsefulEvidence(text))
    .sort((left, right) => scoreEvidence(right) - scoreEvidence(left))
    .slice(0, MAX_EVIDENCE_ITEMS);

  const normalizedFallback = normalizeWhitespace(fallbackDescription ?? "");
  const summary = evidence[0] ?? (normalizedFallback || null);

  return {
    summary,
    evidence,
  };
}

function buildFallbackContext(fallbackDescription: string | null): ArticleContext {
  const normalizedFallback = normalizeWhitespace(fallbackDescription ?? "");

  return {
    summary: normalizedFallback || null,
    evidence: normalizedFallback ? [normalizedFallback] : [],
  };
}

export async function fetchArticleContext(
  url: string,
  fallbackDescription: string | null = null,
): Promise<ArticleContext> {
  const cached = articleContextCache.get(url);
  if (cached && Date.now() - cached.time < ARTICLE_CONTEXT_CACHE_TTL_MS) {
    return cached.context;
  }

  const fallback = buildFallbackContext(fallbackDescription);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ARTICLE_CONTEXT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "GeoScope/1.0 (article context fetcher)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      logger.warn("article context fetch failed", {
        url,
        status: response.status,
      });
      return fallback;
    }

    const html = await response.text();
    const context = extractArticleContextFromHtml(html, fallbackDescription);
    articleContextCache.set(url, { context, time: Date.now() });
    return context;
  } catch (error) {
    logger.warn("article context fetch error", {
      url,
      error: error instanceof Error ? error.message : "unknown",
    });
    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}

export function clearArticleContextCache(): void {
  articleContextCache.clear();
}
