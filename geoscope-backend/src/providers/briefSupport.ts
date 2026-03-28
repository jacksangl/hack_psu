import type { Article } from "../types/article";
import type { BriefDraft } from "../types/brief";
import { getCountryName } from "../utils/countryCodeMap";
import { averageSentimentScore, labelFromScore } from "../utils/sentiment";

const stopwords = new Set([
  "A",
  "An",
  "And",
  "As",
  "At",
  "For",
  "From",
  "In",
  "Of",
  "On",
  "The",
  "To",
  "With",
]);

const formatList = (items: string[]): string => {
  if (items.length === 0) {
    return "";
  }

  if (items.length === 1) {
    return items[0];
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
};

export const extractKeyActors = (articles: Article[]): string[] => {
  const counts = new Map<string, number>();

  for (const article of articles) {
    const matches = article.title.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\b/g) ?? [];

    for (const match of matches) {
      if (stopwords.has(match)) {
        continue;
      }

      counts.set(match, (counts.get(match) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([actor]) => actor)
    .slice(0, 5);
};

export const extractTopicTags = (articles: Article[]): string[] => {
  const counts = new Map<string, number>();

  for (const article of articles) {
    for (const topic of article.topics) {
      counts.set(topic, (counts.get(topic) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([topic]) => topic)
    .slice(0, 5);
};

export const extractLinkedCountries = (articles: Article[]): string[] => {
  const counts = new Map<string, number>();

  for (const article of articles) {
    for (const countryCode of article.relatedCountries) {
      counts.set(countryCode, (counts.get(countryCode) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([countryCode]) => getCountryName(countryCode) ?? countryCode)
    .slice(0, 4);
};

export const buildFallbackBrief = (params: {
  countryName: string;
  articles: Article[];
}): BriefDraft => {
  if (params.articles.length === 0) {
    return {
      summary: `No recent articles were available for ${params.countryName} from the configured providers.`,
      sentiment: "neutral",
      keyActors: [],
      topicTags: [],
    };
  }

  const dominantTopics = extractTopicTags(params.articles).slice(0, 3);
  const linkedCountries = extractLinkedCountries(params.articles).slice(0, 3);
  const latestHeadlines = params.articles
    .slice(0, 2)
    .map((article) => `${article.title} (${article.source})`);
  const averageScore = averageSentimentScore(
    params.articles.map((article) => article.sentiment.score)
  );

  const summaryParts = [
    dominantTopics.length > 0
      ? `${params.countryName} coverage is currently centered on ${formatList(dominantTopics.map((topic) => topic.toLowerCase()))}.`
      : `${params.countryName} is seeing a mixed set of developments across its latest headlines.`,
    `The clearest recent signals are ${formatList(latestHeadlines)}.`,
    linkedCountries.length > 0
      ? `The story also has international spillover through ${formatList(linkedCountries)}.`
      : null,
  ].filter(Boolean);

  return {
    summary: summaryParts.join(" "),
    sentiment: labelFromScore(averageScore),
    keyActors: extractKeyActors(params.articles),
    topicTags: extractTopicTags(params.articles),
  };
};

export const buildBriefingPacket = (params: {
  countryCode: string;
  countryName: string;
  articles: Article[];
}) => {
  const averageScore = averageSentimentScore(
    params.articles.map((article) => article.sentiment.score)
  );

  return {
    articleCount: params.articles.length,
    averageSentimentScore: averageScore,
    dominantTopics: extractTopicTags(params.articles),
    linkedCountries: extractLinkedCountries(params.articles),
    keyActors: extractKeyActors(params.articles),
    articles: params.articles.slice(0, 8).map((article) => ({
      title: article.title,
      source: article.source,
      publishedAt: article.publishedAt,
      description: article.description,
      topics: article.topics,
      relatedCountries: article.relatedCountries.map((countryCode) => getCountryName(countryCode) ?? countryCode),
      sentiment: article.sentiment,
    })),
    countryCode: params.countryCode,
    countryName: params.countryName,
  };
};
