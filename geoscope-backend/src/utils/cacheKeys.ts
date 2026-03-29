import { createHash } from "node:crypto";

const hashValue = (value: unknown): string =>
  createHash("sha1").update(JSON.stringify(value)).digest("hex").slice(0, 12);

export const cacheKeys = {
  brief: (countryCode: string) => `brief:${countryCode}`,
  compare: (countryA: string, countryB: string) => `compare:${countryA}:${countryB}`,
  news: (countryCode: string, query: unknown) => `news:${countryCode}:${hashValue(query)}`,
  sentimentGlobal: () => "sentiment:global",
  trending: (category?: string) => `trending:${category ?? "all"}`,
  biasComparison: (urlHash: string) => `bias:${urlHash}`,
};
