import { briefDraftSchema } from "../schemas/briefSchemas";
import type { BriefDraft } from "../types/brief";
import type { AiProvider, ComparisonDraft, GenerateBriefParams, GenerateComparisonParams } from "./aiProvider";
import {
  buildBriefingPacket,
  buildFallbackBrief,
} from "./briefSupport";

const GEMINI_TIMEOUT_MS = 8_000;

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

  private fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
    return fetch(url, { ...init, signal: controller.signal }).finally(() =>
      clearTimeout(timeout),
    );
  }

  private parseJsonObject(text: string): Record<string, unknown> {
    const trimmed = text.trim();
    const withoutFences = trimmed
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    return JSON.parse(withoutFences) as Record<string, unknown>;
  }

  private stringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
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

IMPORTANT: Only use information from the provided articles. Do not invent or assume facts, names, dates, or events not present in the briefing packet. Every claim in the summary must be traceable to at least one article below.

Briefing packet:
${JSON.stringify(briefingPacket)}

Return ONLY valid JSON, no markdown fences.`;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

      const response = await this.fetchWithTimeout(url, {
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

    const prompt = `You are a media analyst. Given the following news article and how other outlets covered the SAME SPECIFIC EVENT (not just the same topic), produce a JSON object with these exact fields:
- "storyTitle": a neutral, factual title for this story (not from any single source)
- "bulletSummary": an array of 3-5 concise bullet points summarizing the core event and the main coverage takeaways
- "originalSummary": 1-2 sentences summarizing how the original source (${params.originalSource}) framed this story based on their headline: "${params.originalTitle}"
- "sourceSummaries": an array of strings, one per other source, each 1-2 sentences summarizing that outlet's framing/angle
- "keyDifferences": an array of 2-4 strings, each describing a notable difference in how the sources covered this story (tone, emphasis, framing, omissions). Do NOT rate or label bias — just describe factual differences.
- "keyTopics": an array of 3-5 key topics or themes this story covers (e.g. "US Foreign Policy", "Civilian Casualties", "NATO Response")
- "consensus": an array of 2-4 bullet points describing what ALL sources agree on — shared facts, confirmed details
- "disagreements": an array of 2-4 bullet points describing where sources disagree or frame the story differently — different emphasis, omitted details, contrasting tones

Only include sources that are clearly covering the same specific event, not just the same general topic.

IMPORTANT: Only use information from the headlines and descriptions provided below. Do not invent or assume facts, quotes, or details not present in the source material. Every claim must be traceable to at least one source listed here.

Original article (${params.originalSource}): "${params.originalTitle}"

Other sources:
${sourcesInfo}

Return ONLY valid JSON, no markdown fences.`;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

      const response = await this.fetchWithTimeout(url, {
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

      const parsed = this.parseJsonObject(text);
      return {
        storyTitle:
          typeof parsed.storyTitle === "string" && parsed.storyTitle.trim()
            ? parsed.storyTitle
            : params.originalTitle,
        bulletSummary: this.stringArray(parsed.bulletSummary),
        originalSummary:
          typeof parsed.originalSummary === "string" ? parsed.originalSummary : "",
        sourceSummaries: this.stringArray(parsed.sourceSummaries),
        keyDifferences: this.stringArray(parsed.keyDifferences),
        keyTopics: this.stringArray(parsed.keyTopics),
        consensus: this.stringArray(parsed.consensus),
        disagreements: this.stringArray(parsed.disagreements),
      };
    } catch {
      return {
        storyTitle: params.originalTitle,
        bulletSummary: [],
        originalSummary: "",
        sourceSummaries: params.otherSources.map(() => ""),
        keyDifferences: [],
        keyTopics: [],
        consensus: [],
        disagreements: [],
      };
    }
  }
}
