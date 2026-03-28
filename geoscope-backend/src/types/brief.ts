import type { SentimentLabel } from "./sentiment";

export interface BriefDraft {
  summary: string;
  sentiment: SentimentLabel;
  keyActors: string[];
  topicTags: string[];
}

export interface CountryBriefData extends BriefDraft {
  countryCode: string;
  articleCount: number;
}

export interface CountryBriefResponse extends CountryBriefData {
  cached: boolean;
}
