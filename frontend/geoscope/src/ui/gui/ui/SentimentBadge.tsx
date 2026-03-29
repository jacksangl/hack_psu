import {
  sentimentToHex,
  sentimentLabel,
  type Sentiment,
} from "../../../utils/sentimentColors";

interface SentimentBadgeProps {
  sentiment: Sentiment;
  score?: number;
}

export function SentimentBadge({ sentiment, score }: SentimentBadgeProps) {
  const color = sentimentToHex(sentiment);
  const label = sentimentLabel(sentiment);

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{
        backgroundColor: `${color}20`,
        color,
        border: `1px solid ${color}40`,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
      {score !== undefined && (
        <span className="opacity-70">({score > 0 ? "+" : ""}{score.toFixed(2)})</span>
      )}
    </span>
  );
}
