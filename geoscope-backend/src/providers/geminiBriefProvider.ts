import { briefDraftSchema } from "../schemas/briefSchemas";
import type { BriefDraft } from "../types/brief";
import type { AiProvider, GenerateBriefParams } from "./aiProvider";
import {
  buildBriefingPacket,
  buildFallbackBrief,
} from "./briefSupport";

interface GeminiBriefProviderOptions {
  apiKey: string;
  model?: string;
}

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

    const briefingPacket = buildBriefingPacket(params);

    const prompt = `You are a geopolitical news editor. Given the following briefing packet, produce a JSON object with these exact fields:
- "summary": a concise 2-3 sentence country brief
- "sentiment": one of "negative", "neutral", or "positive"
- "keyActors": array of up to 5 key people/organizations mentioned
- "topicTags": array of up to 5 topic tags

Write the summary as a synthesis, not a headline list. Lead with the dominant storyline, explain what changed most recently, and include cross-border implications if the article set supports it. Avoid filler.

Briefing packet:
${JSON.stringify(briefingPacket)}

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
