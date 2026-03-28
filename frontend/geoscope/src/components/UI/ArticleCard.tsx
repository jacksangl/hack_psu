import { SentimentBadge } from "./SentimentBadge";
import type { Sentiment } from "../../utils/sentimentColors";

interface ArticleCardProps {
  title: string;
  source: string;
  publishedAt: string;
  url: string;
  sentiment: Sentiment;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  return `${diffDays}d ago`;
}

export function ArticleCard({
  title,
  source,
  publishedAt,
  url,
  sentiment,
}: ArticleCardProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-3 rounded-lg bg-globe-card border border-slate-800 hover:border-slate-700 transition-colors duration-200 group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-medium text-slate-200 leading-snug group-hover:text-white transition-colors duration-200">
          {title}
        </h4>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="font-medium text-slate-400">{source}</span>
          <span>·</span>
          <span>{formatDate(publishedAt)}</span>
        </div>
        <SentimentBadge sentiment={sentiment} />
      </div>
    </a>
  );
}
