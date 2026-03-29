import { useNavigate } from "react-router-dom";
import type { TrendingArticle } from "../../data/news/client";

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

interface TrendingTickerProps {
  articles: TrendingArticle[];
}

export function TrendingTicker({ articles }: TrendingTickerProps) {
  const navigate = useNavigate();
  const display = articles.slice(0, 8);

  return (
    <section className="bg-wwn-surface-lowest py-4 overflow-hidden">
      <div className="flex items-center gap-2 mb-3 px-6">
        <span className="w-2 h-2 rounded-full bg-wwn-primary animate-pulse" />
        <span className="font-data text-[10px] font-semibold uppercase tracking-[0.15em] text-wwn-primary-soft">
          Trending Now
        </span>
      </div>
      <div className="flex gap-4 px-6 overflow-x-auto pb-2 scrollbar-hide">
        {display.map((article) => (
          <button
            key={article.id}
            onClick={() =>
              navigate(`/article/${encodeURIComponent(article.url)}`, {
                state: {
                  title: article.title,
                  source: article.source,
                  url: article.url,
                },
              })
            }
            className="flex-shrink-0 w-72 p-4 bg-wwn-surface-low hover:bg-wwn-surface-high transition-colors duration-200 text-left group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-data text-[10px] font-semibold uppercase tracking-[0.12em] text-wwn-primary-soft">
                {article.source}
              </span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-wwn-text-variant opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <path d="M2 10L10 2M10 2H4M10 2v6" />
              </svg>
            </div>
            <p className="font-body text-sm text-wwn-on-surface leading-snug line-clamp-2">
              {article.title}
            </p>
            <span className="font-data text-[10px] text-wwn-text-variant mt-2 block">
              {formatTime(article.publishedAt)}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
