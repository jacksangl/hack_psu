import type { SentimentEntry, SentimentResponse } from "./types";

export type SentimentEntryMap = Record<string, SentimentEntry>;

export function indexSentimentEntries(
  response: SentimentResponse
): SentimentEntryMap {
  const sentimentByCountry: SentimentEntryMap = {};

  for (const entry of response.countries) {
    sentimentByCountry[entry.countryCode] = entry;
  }

  return sentimentByCountry;
}

