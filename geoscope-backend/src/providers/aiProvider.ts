import type { Article } from "../types/article";
import type { BriefDraft } from "../types/brief";

export interface GenerateBriefParams {
  countryCode: string;
  countryName: string;
  articles: Article[];
}

export interface GenerateComparisonParams {
  originalTitle: string;
  originalSource: string;
  otherSources: Array<{
    source: string;
    headline: string;
    description: string | null;
  }>;
}

export interface ComparisonDraft {
  storyTitle: string;
  originalSummary: string;
  sourceSummaries: string[];
  keyDifferences: string[];
}

export interface AiProvider {
  readonly name: string;
  generateBrief(params: GenerateBriefParams): Promise<BriefDraft>;
  generateComparison(params: GenerateComparisonParams): Promise<ComparisonDraft>;
}
