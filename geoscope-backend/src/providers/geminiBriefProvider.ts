import { briefDraftSchema } from "../schemas/briefSchemas";
import type { Article } from "../types/article";
import type { BriefDraft } from "../types/brief";
import { averageSentimentScore, labelFromScore } from "../utils/sentiment";
import type { AiProvider, GenerateBriefParams } from "./aiProvider";

interface GeminiBriefProviderOptions {
  apiKey: string;
  model?: string;
}

const extractKeyActors = (articles: Article[]): string[] => {
  const stopwords = new Set([
    "A", "An", "And", "As", "At", "For", "From", "In", "Of", "On", "The", "To", "With",
  ]);
  const counts = new Map<string, number>();
  for (const article of articles) {
    const matches = article.title.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\b/g) ?? [];
    for (const match of matches) {
      if (stopwords.has(match)) continue;
      counts.set(match, (counts.get(match) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([actor]) => actor)
    .slice(0, 5);
};

const extractTopicTags = (articles: Article[]): string[] => {
  const counts = new Map<string, number>();
  for (const article of articles) {
    for (const topic of article.topics) {
      counts.set(topic, (counts.get(topic) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([topic]) => topic)
    .slice(0, 5);
};

const buildFallbackBrief = ({ countryName, articles }: GenerateBriefParams): BriefDraft => {
  if (articles.length === 0) {
    return {
      summary: `No recent articles were available for ${countryName}.`,
      sentiment: "neutral",
      keyActors: [],
      topicTags: [],
    };
  }
  const headlines = articles
    .slice(0, 3)
    .map((a) => `"${a.title}" (${a.source})`)
    .join("; ");
  const avg = averageSentimentScore(articles.map((a) => a.sentiment.score));
  return {
    summary: `Recent coverage in ${countryName} is centered on ${headlines}.`,
    sentiment: labelFromScore(avg),
    keyActors: extractKeyActors(articles),
    topicTags: extractTopicTags(articles),
  };
};

export class GeminiBriefProvider implements AiProvider {
  public readonly name = "gemini";
  private readonly apiKey: string;
  private readonly model: string;

  constructor(options: GeminiBriefProviderOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model ?? "gemini-2.0-flash";
  }

  async generateBrief(params: GenerateBriefParams): Promise<BriefDraft> {
    if (params.articles.length === 0) {
      return buildFallbackBrief(params);
    }

    const articlePayload = params.articles.slice(0, 8).map((a) => ({
      title: a.title,
      source: a.source,
      description: a.description,
      publishedAt: a.publishedAt,
      topics: a.topics,
    }));

    const prompt = `You are a news analyst. Given the following articles about ${params.countryName} (${params.countryCode}), produce a JSON object with these exact fields:
- "summary": a concise 2-3 sentence country brief
- "sentiment": one of "negative", "neutral", or "positive"
- "keyActors": array of up to 5 key people/organizations mentioned
- "topicTags": array of up to 5 topic tags

Articles:
${JSON.stringify(articlePayload)}

Return ONLY valid JSON, no markdown fences.`;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.3,
          },
        }),
      });

      if (!response.ok) {
        return buildFallbackBrief(params);
      }

      const payload = await response.json();
      const text =
        payload?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;

      if (!text) {
        return buildFallbackBrief(params);
      }

      return briefDraftSchema.parse(JSON.parse(text));
    } catch {
      return buildFallbackBrief(params);
    }
  }
}
