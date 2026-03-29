export interface SourceBiasAnalysis {
  emphasizedDetails: string[];
  overallOpinion: string;
}

export interface SourceCoverage {
  source: string;
  headline: string;
  summary: string;
  url: string;
  detectedBias?: SourceBiasAnalysis;
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
  singleSource: boolean;
}

export interface BiasComparisonResponse extends BiasComparisonData {
  cached: boolean;
}
