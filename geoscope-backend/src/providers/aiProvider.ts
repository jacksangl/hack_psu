import type { Article } from "../types/article";
import type { BriefDraft } from "../types/brief";
import type { SourceBiasAnalysis } from "../types/biasComparison";

export interface GenerateBriefParams {
  countryCode: string;
  countryName: string;
  articles: Article[];
}

export interface GenerateComparisonParams {
  originalArticle: {
    source: string;
    headline: string;
    description: string | null;
    evidence: string[];
  };
  otherSources: Array<{
    source: string;
    headline: string;
    description: string | null;
    evidence: string[];
  }>;
}

export interface ComparisonDraft {
  storyTitle: string;
  bulletSummary: string[];
  originalSummary: string;
  sourceSummaries: string[];
  originalBias: SourceBiasAnalysis;
  sourceBiases: SourceBiasAnalysis[];
  keyDifferences: string[];
  keyTopics: string[];
  consensus: string[];
  disagreements: string[];
}

export interface AiProvider {
  readonly name: string;
  generateBrief(params: GenerateBriefParams): Promise<BriefDraft>;
  generateComparison(params: GenerateComparisonParams): Promise<ComparisonDraft>;
}
