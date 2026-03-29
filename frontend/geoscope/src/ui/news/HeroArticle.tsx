import { useNavigate } from "react-router-dom";
import type { TrendingArticle } from "../../data/news/client";

interface HeroArticleProps {
  article: TrendingArticle;
}

export function HeroArticle({ article }: HeroArticleProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() =>
        navigate(`/article/${encodeURIComponent(article.url)}`, {
          state: {
            title: article.title,
            source: article.source,
            url: article.url,
          },
        })
      }
      className="w-full text-left group"
    >
      <div className="bg-wwn-surface-low p-8 md:p-12 transition-colors duration-200 hover:bg-wwn-surface-high/50">
        <span className="inline-block px-3 py-1 mb-4 bg-wwn-primary/20 text-wwn-primary font-data text-[10px] font-semibold uppercase tracking-[0.15em]">
          {article.category || "Breaking"}
        </span>
        <h2 className="font-serif text-3xl md:text-5xl font-bold text-wwn-on-surface leading-tight mb-4 group-hover:text-wwn-primary-soft transition-colors duration-200">
          {article.title}
        </h2>
        {article.description && (
          <p className="font-body text-base md:text-lg text-wwn-text-variant leading-relaxed max-w-3xl mb-6">
            {article.description}
          </p>
        )}
        <div className="flex items-center gap-3">
          <span className="font-data text-xs font-semibold uppercase tracking-wider text-wwn-primary-soft">
            {article.source}
          </span>
          <span className="text-wwn-text-variant">·</span>
          <span className="font-data text-xs text-wwn-text-variant">
            {new Date(article.publishedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>
    </button>
  );
}
