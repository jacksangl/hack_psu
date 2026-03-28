import type { ProviderNewsArticle } from "../providers/newsProvider";

export const dedupeProviderArticles = (articles: ProviderNewsArticle[]): ProviderNewsArticle[] => {
  const seenUrls = new Set<string>();
  const seenRawIds = new Set<string>();
  const seenFallbackKeys = new Set<string>();
  const deduped: ProviderNewsArticle[] = [];

  for (const article of articles) {
    const urlKey = article.url.trim();
    const rawIdKey = article.rawId?.trim();
    const fallbackKey = [article.title.trim(), urlKey, article.publishedAt].join("|");

    if (seenUrls.has(urlKey) || (rawIdKey && seenRawIds.has(rawIdKey)) || seenFallbackKeys.has(fallbackKey)) {
      continue;
    }

    seenUrls.add(urlKey);

    if (rawIdKey) {
      seenRawIds.add(rawIdKey);
    }

    seenFallbackKeys.add(fallbackKey);
    deduped.push(article);
  }

  return deduped;
};
