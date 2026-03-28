import { briefDraftSchema } from "../schemas/briefSchemas";
import type { Article } from "../types/article";
import type { BriefDraft } from "../types/brief";
import { averageSentimentScore, labelFromScore } from "../utils/sentiment";
import type { AiProvider, GenerateBriefParams } from "./aiProvider";

interface OpenAIBriefProviderOptions {
  apiKey: string;
  model?: string;
}

const responseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "sentiment", "keyActors", "topicTags"],
  properties: {
    summary: {
      type: "string",
    },
    sentiment: {
      type: "string",
      enum: ["negative", "neutral", "positive"],
    },
    keyActors: {
      type: "array",
      items: {
        type: "string",
      },
      maxItems: 5,
    },
    topicTags: {
      type: "array",
      items: {
        type: "string",
      },
      maxItems: 5,
    },
  },
} as const;

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

const getResponseText = (payload: unknown): string | null => {
  if (
    payload &&
    typeof payload === "object" &&
    "output_text" in payload &&
    typeof payload.output_text === "string"
  ) {
    return payload.output_text;
  }

  if (
    payload &&
    typeof payload === "object" &&
    "output" in payload &&
    Array.isArray(payload.output)
  ) {
    const chunks: string[] = [];

    for (const outputItem of payload.output) {
      if (!outputItem || typeof outputItem !== "object" || !("content" in outputItem)) {
        continue;
      }

      const content = (outputItem as { content?: unknown }).content;
      if (!Array.isArray(content)) {
        continue;
      }

      for (const part of content) {
        if (part && typeof part === "object" && "text" in part && typeof part.text === "string") {
          chunks.push(part.text);
        }
      }
    }

    return chunks.length > 0 ? chunks.join("\n") : null;
  }

  return null;
};

const extractKeyActors = (articles: Article[]): string[] => {
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

const extractTopicTags = (articles: Article[]): string[] => {
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

const buildFallbackBrief = ({ countryName, articles }: GenerateBriefParams): BriefDraft => {
  if (articles.length === 0) {
    return {
      summary: `No recent articles were available for ${countryName} from the configured providers.`,
      sentiment: "neutral",
      keyActors: [],
      topicTags: [],
    };
  }

  const headlines = articles
    .slice(0, 3)
    .map((article) => `"${article.title}" (${article.source})`)
    .join("; ");

  const averageScore = averageSentimentScore(articles.map((article) => article.sentiment.score));

  return {
    summary: `Recent coverage in ${countryName} is centered on ${headlines}. This fallback brief is based on article headlines and sources because the AI summary service was unavailable.`,
    sentiment: labelFromScore(averageScore),
    keyActors: extractKeyActors(articles),
    topicTags: extractTopicTags(articles),
  };
};

export class OpenAIBriefProvider implements AiProvider {
  public readonly name = "openai";
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl = "https://api.openai.com/v1/responses";

  constructor(options: OpenAIBriefProviderOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model ?? "gpt-4o-mini";
  }

  async generateBrief(params: GenerateBriefParams): Promise<BriefDraft> {
    if (params.articles.length === 0) {
      return buildFallbackBrief(params);
    }

    const articlePayload = params.articles.slice(0, 8).map((article) => ({
      description: article.description,
      publishedAt: article.publishedAt,
      source: article.source,
      title: article.title,
      topics: article.topics,
    }));

    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          input: [
            {
              role: "system",
              content:
                "You summarize country news. Use only the supplied articles. Return strict JSON that matches the schema exactly.",
            },
            {
              role: "user",
              content: JSON.stringify({
                articles: articlePayload,
                countryCode: params.countryCode,
                countryName: params.countryName,
                instructions:
                  "Create a concise country brief, overall sentiment label, up to five key actors, and up to five topic tags.",
              }),
            },
          ],
          text: {
            format: {
              type: "json_schema",
              name: "country_brief",
              strict: true,
              schema: responseSchema,
            },
          },
        }),
      });

      if (!response.ok) {
        return buildFallbackBrief(params);
      }

      const payload = await response.json();
      const rawText = getResponseText(payload);

      if (!rawText) {
        return buildFallbackBrief(params);
      }

      return briefDraftSchema.parse(JSON.parse(rawText) as unknown);
    } catch {
      return buildFallbackBrief(params);
    }
  }
}
