import type { ArticleSentiment, SentimentLabel } from "../types/sentiment";

const positiveTerms = [
  "agreement",
  "approve",
  "breakthrough",
  "calm",
  "cooperation",
  "deal",
  "growth",
  "improve",
  "optimistic",
  "progress",
  "recovery",
  "relief",
  "support",
  "win",
];

const negativeTerms = [
  "attack",
  "conflict",
  "crisis",
  "decline",
  "dispute",
  "fear",
  "loss",
  "protest",
  "risk",
  "sanction",
  "shortage",
  "strike",
  "violence",
  "war",
];

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const scoreKeywordHits = (text: string): number => {
  const normalized = text.toLowerCase();

  const positiveHits = positiveTerms.reduce((count, term) => count + Number(normalized.includes(term)), 0);
  const negativeHits = negativeTerms.reduce((count, term) => count + Number(normalized.includes(term)), 0);

  if (positiveHits === 0 && negativeHits === 0) {
    return 0;
  }

  return clamp((positiveHits - negativeHits) / Math.max(positiveHits + negativeHits, 1), -1, 1);
};

export const labelFromScore = (score: number): SentimentLabel => {
  if (score <= -0.2) {
    return "negative";
  }

  if (score >= 0.2) {
    return "positive";
  }

  return "neutral";
};

export const computeArticleSentiment = (
  title: string,
  description?: string | null,
  providerToneScore?: number | null,
): ArticleSentiment => {
  const keywordScore = scoreKeywordHits([title, description].filter(Boolean).join(" "));

  const toneScore =
    typeof providerToneScore === "number" && Number.isFinite(providerToneScore)
      ? clamp(providerToneScore, -1, 1)
      : null;

  const score =
    toneScore === null ? keywordScore : clamp((keywordScore + toneScore) / 2, -1, 1);

  return {
    score,
    label: labelFromScore(score),
  };
};

export const averageSentimentScore = (scores: number[]): number => {
  if (scores.length === 0) {
    return 0;
  }

  const total = scores.reduce((sum, value) => sum + value, 0);
  return clamp(total / scores.length, -1, 1);
};
