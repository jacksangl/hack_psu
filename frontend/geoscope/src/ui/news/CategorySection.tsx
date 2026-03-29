import { useNavigate } from "react-router-dom";
import type { TrendingArticle } from "../../data/news/client";

interface CategorySectionProps {
  title: string;
  articles: TrendingArticle[];
}

export function CategorySection({ title, articles }: CategorySectionProps) {
  const navigate = useNavigate();

  if (articles.length === 0) return null;

  return (
    <div>
      <h3 className="font-data text-[10px] font-semibold uppercase tracking-[0.15em] text-wwn-text-variant mb-4">
        {title}
      </h3>
      <div className="space-y-1">
        {articles.slice(0, 4).map((article) => (
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
            className="w-full text-left p-4 bg-wwn-surface-low hover:bg-wwn-surface-high transition-colors duration-200 group"
          >
            <h4 className="font-serif text-base md:text-lg font-medium text-wwn-on-surface leading-snug mb-2 group-hover:text-wwn-primary-soft transition-colors duration-200">
              {article.title}
            </h4>
            {article.description && (
              <p className="font-body text-sm text-wwn-text-variant line-clamp-2 mb-2">
                {article.description}
              </p>
            )}
            <div className="flex items-center gap-2 text-xs">
              <span className="font-data font-medium text-wwn-primary-soft uppercase tracking-wider">
                {article.source}
              </span>
              <span className="text-wwn-text-variant">·</span>
              <span className="font-data text-wwn-text-variant">
                {new Date(article.publishedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
