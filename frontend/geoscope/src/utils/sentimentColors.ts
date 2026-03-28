export type Sentiment = "positive" | "neutral" | "negative" | "crisis";

const SENTIMENT_HEX: Record<Sentiment, string> = {
  positive: "#14b8a6",
  neutral: "#64748b",
  negative: "#f59e0b",
  crisis: "#ef4444",
};

const SENTIMENT_RGB: Record<Sentiment, [number, number, number]> = {
  positive: [0.08, 0.72, 0.65],
  neutral: [0.39, 0.45, 0.55],
  negative: [0.96, 0.62, 0.04],
  crisis: [0.94, 0.27, 0.27],
};

export function sentimentToHex(sentiment: Sentiment): string {
  return SENTIMENT_HEX[sentiment];
}

export function sentimentToRgb(sentiment: Sentiment): [number, number, number] {
  return SENTIMENT_RGB[sentiment];
}

export function sentimentLabel(sentiment: Sentiment): string {
  const labels: Record<Sentiment, string> = {
    positive: "Positive",
    neutral: "Neutral",
    negative: "Negative",
    crisis: "Crisis",
  };
  return labels[sentiment];
}
