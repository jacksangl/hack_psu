import { briefDraftSchema } from "../schemas/briefSchemas";
import type { BriefDraft } from "../types/brief";
import type { AiProvider, ComparisonDraft, GenerateBriefParams, GenerateComparisonParams } from "./aiProvider";
import {
  buildBriefingPacket,
  buildFallbackBrief,
} from "./briefSupport";

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

    const briefingPacket = buildBriefingPacket(params);

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
                "You are a geopolitical news editor. Use only the supplied article packet. Every claim must be grounded in the provided article titles, sources, descriptions, and timestamps. Do not invent facts, quotes, names, dates, or implications that are not explicitly supported by the packet. Write a sharp 3-4 sentence synthesis, not a list of headlines. Lead with the dominant storyline, then explain what changed most recently, then note implications or cross-border links only if present in the packet. Keep the wording concrete, sober, and information-dense. Return strict JSON that matches the schema exactly.",
            },
            {
              role: "user",
              content: JSON.stringify({
                briefingPacket,
                instructions:
                  "Create an executive-style country brief, overall sentiment label, up to five key actors, and up to five topic tags. Ground the brief in the article packet fields only. Avoid repeating article titles verbatim unless necessary. If coverage is mixed, say so explicitly. Prefer synthesis over chronology.",
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
          temperature: 0.2,
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

  async generateComparison(params: GenerateComparisonParams): Promise<ComparisonDraft> {
    // Fallback — OpenAI comparison not implemented yet
    return {
      storyTitle: params.originalArticle.headline,
      bulletSummary: [],
      originalSummary: "",
      sourceSummaries: params.otherSources.map(() => ""),
      originalBias: { emphasizedDetails: [], overallOpinion: "" },
      sourceBiases: params.otherSources.map(() => ({ emphasizedDetails: [], overallOpinion: "" })),
      keyDifferences: [],
      keyTopics: [],
      consensus: [],
      disagreements: [],
    };
  }
}
