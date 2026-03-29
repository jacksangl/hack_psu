export interface SourceCoverage {
  source: string;
  headline: string;
  summary: string;
  url: string;
}

export interface BiasComparisonData {
  storyTitle: string;
  bulletSummary: string[];
  originalSource: SourceCoverage;
  otherSources: SourceCoverage[];
  keyDifferences: string[];
  keyTopics: string[];
  consensus: string[];
  disagreements: string[];
}

export interface BiasComparisonResponse extends BiasComparisonData {
  cached: boolean;
}
