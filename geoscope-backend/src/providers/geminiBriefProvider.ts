import { briefDraftSchema } from "../schemas/briefSchemas";
import type { BriefDraft } from "../types/brief";
import type { AiProvider, ComparisonDraft, GenerateBriefParams, GenerateComparisonParams } from "./aiProvider";
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

  async generateComparison(params: GenerateComparisonParams): Promise<ComparisonDraft> {
    const sourcesInfo = params.otherSources
      .map((s, i) => `Source ${i + 1} (${s.source}): "${s.headline}"${s.description ? ` - ${s.description}` : ""}`)
      .join("\n");

    const prompt = `You are a media analyst. Given the following news article and how other outlets covered the same story, produce a JSON object with these exact fields:
- "storyTitle": a neutral, factual title for this story (not from any single source)
- "originalSummary": 1-2 sentences summarizing how the original source (${params.originalSource}) framed this story based on their headline: "${params.originalTitle}"
- "sourceSummaries": an array of strings, one per other source, each 1-2 sentences summarizing that outlet's framing/angle
- "keyDifferences": an array of 2-4 strings, each describing a notable difference in how the sources covered this story (tone, emphasis, framing, omissions). Do NOT rate or label bias — just describe factual differences.

Original article (${params.originalSource}): "${params.originalTitle}"

Other sources:
${sourcesInfo}

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
        throw new Error(`Gemini API returned ${response.status}`);
      }

      const payload = await response.json();
      const text =
        payload?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;

      if (!text) {
        throw new Error("No text in Gemini response");
      }

      const parsed = JSON.parse(text);
      return {
        storyTitle: parsed.storyTitle ?? params.originalTitle,
        originalSummary: parsed.originalSummary ?? "",
        sourceSummaries: parsed.sourceSummaries ?? [],
        keyDifferences: parsed.keyDifferences ?? [],
      };
    } catch {
      return {
        storyTitle: params.originalTitle,
        originalSummary: "",
        sourceSummaries: params.otherSources.map(() => ""),
        keyDifferences: [],
      };
    }
  }
}
