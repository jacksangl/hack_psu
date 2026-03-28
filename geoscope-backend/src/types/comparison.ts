import type { CountryBriefData } from "./brief";
import type { SentimentLabel } from "./sentiment";

export interface SentimentContrast {
  left: SentimentLabel;
  right: SentimentLabel;
  delta: number;
}

export interface CountryComparisonData {
  left: CountryBriefData;
  right: CountryBriefData;
  comparison: {
    sharedTopics: string[];
    sentimentContrast: SentimentContrast;
    actorOverlap: string[];
  };
}

export interface CountryComparisonResponse extends CountryComparisonData {
  cached: boolean;
}
