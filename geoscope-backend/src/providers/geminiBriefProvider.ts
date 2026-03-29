import { briefDraftSchema } from "../schemas/briefSchemas";
import type { SourceBiasAnalysis } from "../types/biasComparison";
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

  private biasAnalysis(value: unknown): SourceBiasAnalysis {
    if (!value || typeof value !== "object") {
      return { emphasizedDetails: [], overallOpinion: "" };
    }

    const record = value as { emphasizedDetails?: unknown; overallOpinion?: unknown };

    return {
      emphasizedDetails: this.stringArray(record.emphasizedDetails),
      overallOpinion: typeof record.overallOpinion === "string" ? record.overallOpinion.trim() : "",
    };
  }

  private biasAnalysisArray(value: unknown): SourceBiasAnalysis[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.map((item) => this.biasAnalysis(item));
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

IMPORTANT: Only use information from the provided articles. Each article entry includes title, source, description, publishedAt, topics, relatedCountries, and sentiment. Do not invent or assume facts, names, dates, or events not present in the briefing packet. Every claim in the summary must be traceable to at least one article below.

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
      .map((s, i) => {
        const evidenceInfo = s.evidence.length > 0
          ? s.evidence.map((detail) => `  - ${detail}`).join("\n")
          : "  - Not available";

        return `Source ${i + 1}\n- Outlet: ${s.source}\n- Title: ${s.headline}\n- Description: ${s.description ?? "Not provided"}\n- Evidence:\n${evidenceInfo}`;
      })
      .join("\n");

    const prompt = `You are a media analyst. Given the following news article and how other outlets covered the SAME SPECIFIC EVENT (not just the same topic), produce a JSON object with these exact fields:
- "storyTitle": a neutral, factual title for this story (not from any single source)
- "bulletSummary": an array of 3-5 concise bullet points summarizing the core event and the main coverage takeaways
- "originalSummary": 1-2 sentences summarizing how the original source framed this story based only on the original title and description provided below
- "sourceSummaries": an array of strings, one per other source, each 1-2 sentences summarizing that outlet's framing/angle
- "keyDifferences": an array of 2-4 strings, each describing a notable difference in how the sources covered this story (tone, emphasis, framing, omissions). Do NOT rate or label bias — just describe factual differences.
- "keyTopics": an array of 3-5 key topics or themes this story covers (e.g. "US Foreign Policy", "Civilian Casualties", "NATO Response")
- "consensus": an array of 2-4 bullet points describing what ALL sources agree on — shared facts, confirmed details
- "disagreements": an array of 2-4 bullet points describing where sources disagree or frame the story differently — different emphasis, omitted details, contrasting tones

Only include sources that are clearly covering the same specific event, not just the same general topic.

IMPORTANT: Only use information from the titles, outlet names, and descriptions provided below. Do not invent or assume facts, quotes, dates, or details not present in the source material. If the provided material does not support a claim, omit it. Every claim must be traceable to at least one source listed here.

Original article:
- Outlet: ${params.originalArticle.source}
- Title: ${params.originalArticle.headline}
- Description: ${params.originalArticle.description ?? "Not provided"}

Other sources:
${sourcesInfo}

Return ONLY valid JSON, no markdown fences.`;
    const comparisonPrompt = `You are a media analyst. Given the following news article and how other outlets covered the SAME SPECIFIC EVENT (not just the same topic), produce a JSON object with these exact fields:
- "storyTitle": a neutral, factual title for this story (not from any single source)
- "bulletSummary": an array of 3-5 concise bullet points summarizing the core event and the main coverage takeaways
- "originalSummary": 1-2 sentences summarizing how the original source framed this story based only on the original title and description provided below
- "sourceSummaries": an array of strings, one per other source, each 1-2 sentences summarizing that outlet's framing/angle
- "originalBias": an object with:
  - "emphasizedDetails": array of 2-4 short semantic phrases capturing what the original source foregrounds most. These should be contextual descriptions like "the legal case and prosecutors' account" or "police action and immediate public-safety risk", not isolated keywords or names.
  - "overallOpinion": 1 sentence beginning with "This source..." that explains the source's overall stance, tone, or attitude toward the story and how its emphasis shapes that tone
- "sourceBiases": an array of objects, one per other source, each with:
  - "emphasizedDetails": array of 2-4 short semantic phrases capturing what that source foregrounds most, not isolated keywords
  - "overallOpinion": 1 sentence beginning with "This source..." that explains that source's overall stance, tone, or attitude toward the story and how its emphasis shapes that tone
- "keyDifferences": an array of 2-4 strings explaining how the sources' emphasis changes the tone or interpretation of the story. Name the outlet and the concrete detail it leans on, then explain what that does to the framing.
- "keyTopics": an array of 3-5 key topics or themes this story covers (e.g. "US Foreign Policy", "Civilian Casualties", "NATO Response")
- "consensus": an array of 2-4 bullet points describing what ALL sources agree on - shared facts, confirmed details
- "disagreements": an array of 2-4 bullet points describing where sources diverge in emphasis or framing, and each point must be grounded in explicit details from the listed titles or descriptions. Avoid meta observations about coverage quality or the number of sources.

Only include sources that are clearly covering the same specific event, not just the same general topic.
For "overallOpinion", describe framing in plain language such as "This source takes a security-first tone, foregrounding police and prosecutors' account of a thwarted attack" or "This source is more skeptical of the official response and dwells on the policy fallout." Do not assign partisan labels or ideology scores.
Write story-specific observations, not generic media commentary. Avoid phrases like "some outlets add context", "headlines vary", "source selection changes", or "X outlets are covering this event."
Avoid outputs like "X emphasizes Police and Paris" or other keyword lists without interpretation.

IMPORTANT: Only use information from the titles, outlet names, and descriptions provided below. Do not invent or assume facts, quotes, dates, or details not present in the source material. If the provided material does not support a claim, omit it. Every claim must be traceable to at least one source listed here.

Original article:
- Outlet: ${params.originalArticle.source}
- Title: ${params.originalArticle.headline}
- Description: ${params.originalArticle.description ?? "Not provided"}

Other sources:
${sourcesInfo}

Return ONLY valid JSON, no markdown fences.`;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

      const response = await this.fetchWithTimeout(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: comparisonPrompt }] }],
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
            : params.originalArticle.headline,
        bulletSummary: this.stringArray(parsed.bulletSummary),
        originalSummary:
          typeof parsed.originalSummary === "string" ? parsed.originalSummary : "",
        sourceSummaries: this.stringArray(parsed.sourceSummaries),
        originalBias: this.biasAnalysis(parsed.originalBias),
        sourceBiases: this.biasAnalysisArray(parsed.sourceBiases),
        keyDifferences: this.stringArray(parsed.keyDifferences),
        keyTopics: this.stringArray(parsed.keyTopics),
        consensus: this.stringArray(parsed.consensus),
        disagreements: this.stringArray(parsed.disagreements),
      };
    } catch {
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
}
