import { useNavigate } from "react-router-dom";
import type { TrendingArticle } from "../../data/news/client";

interface HeroArticleProps {
  article: TrendingArticle;
}

export function HeroArticle({ article }: HeroArticleProps) {
  const navigate = useNavigate();
  const publishedLabel = new Date(article.publishedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

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
      <div className="relative overflow-hidden bg-wwn-surface-low min-h-[28rem] md:min-h-[34rem]">
        {article.imageUrl && (
          <div className="absolute inset-0">
            <img
              src={article.imageUrl}
              alt=""
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-wwn-bg via-wwn-bg/72 to-wwn-bg/18" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(233,69,96,0.16),transparent_42%)]" />

        <div className="relative flex min-h-[28rem] md:min-h-[34rem] items-end p-8 md:p-12">
          <div className="max-w-4xl">
            <span className="inline-block px-3 py-1 mb-4 bg-wwn-primary/20 text-wwn-primary font-data text-[10px] font-semibold uppercase tracking-[0.15em]">
              {article.category || "Breaking"}
            </span>
            <h2 className="font-serif text-3xl md:text-5xl font-bold text-white leading-tight mb-4 group-hover:text-wwn-primary-soft transition-colors duration-200">
              {article.title}
            </h2>
            {article.description && (
              <p className="font-body text-base md:text-lg text-white/78 leading-relaxed max-w-3xl mb-6">
                {article.description}
              </p>
            )}
            <div className="flex items-center gap-3 text-white/80">
              <span className="font-data text-xs font-semibold uppercase tracking-wider text-wwn-primary-soft">
                {article.source}
              </span>
              <span className="text-white/40">·</span>
              <span className="font-data text-xs">
                {publishedLabel}
              </span>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
