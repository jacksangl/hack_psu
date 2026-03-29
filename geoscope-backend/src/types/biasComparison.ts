export interface SourceCoverage {
  source: string;
  headline: string;
  summary: string;
  url: string;
}

export interface BiasComparisonData {
  storyTitle: string;
  originalSource: SourceCoverage;
  otherSources: SourceCoverage[];
  keyDifferences: string[];
}

export interface BiasComparisonResponse extends BiasComparisonData {
  cached: boolean;
}
