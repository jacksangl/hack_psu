import { useTrendingNews } from "../ui/hooks/useTrendingNews";
import { TrendingTicker } from "../ui/news/TrendingTicker";
import { HeroArticle } from "../ui/news/HeroArticle";
import { CategorySection } from "../ui/news/CategorySection";
import type { TrendingArticle } from "../data/news/client";

function groupByCategory(articles: TrendingArticle[]): Record<string, TrendingArticle[]> {
  const groups: Record<string, TrendingArticle[]> = {};
  for (const article of articles) {
    const cat = article.category || "World";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(article);
  }
  return groups;
}

const CATEGORY_DISPLAY: Record<string, string> = {
  Politics: "Politics",
  Economy: "Finance",
  Business: "Business",
  Technology: "Technology",
  Climate: "Climate",
  Conflict: "World",
  Health: "Health",
  Diplomacy: "Diplomacy",
  Sports: "Sports",
  Culture: "Culture",
  World: "World",
};

export function NewsHomePage() {
  const { data, isLoading, error } = useTrendingNews();

  const articles = data?.articles ?? [];
  const hero = articles[0] ?? null;
  const remaining = articles.slice(1);
  const grouped = groupByCategory(remaining);

  // Pick top categories to display
  const categoryEntries = Object.entries(grouped)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 6);

  return (
    <div className="w-full h-full overflow-y-auto bg-wwn-bg pt-14">
      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 border-2 border-wwn-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex flex-col items-center justify-center py-24 px-6">
          <p className="font-body text-sm text-red-400 mb-2">Unable to load news</p>
          <p className="font-data text-xs text-wwn-text-variant">{error}</p>
        </div>
      )}

      {!isLoading && !error && articles.length > 0 && (
        <>
          {/* Trending Ticker */}
          <TrendingTicker articles={articles} />

          {/* Hero Article */}
          {hero && (
            <section className="px-6 py-8">
              <HeroArticle article={hero} />
            </section>
          )}

          {/* Category Grid */}
          <section className="px-6 pb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {categoryEntries.map(([cat, catArticles]) => (
                <CategorySection
                  key={cat}
                  title={CATEGORY_DISPLAY[cat] ?? cat}
                  articles={catArticles}
                />
              ))}
            </div>
          </section>

          {/* Footer */}
          <footer className="px-6 py-8 bg-wwn-surface-lowest">
            <div className="flex items-center justify-between">
              <span className="font-data text-sm font-bold tracking-[0.2em] text-wwn-primary-soft uppercase">
                WWN
              </span>
              <div className="flex items-center gap-6">
                <span className="font-data text-[10px] uppercase tracking-wider text-wwn-text-variant">
                  Intelligence Briefs
                </span>
                <span className="font-data text-[10px] uppercase tracking-wider text-wwn-text-variant">
                  Privacy Protocol
                </span>
                <span className="font-data text-[10px] uppercase tracking-wider text-wwn-text-variant">
                  Terms of Service
                </span>
              </div>
            </div>
          </footer>
        </>
      )}

      {!isLoading && !error && articles.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 px-6">
          <p className="font-body text-sm text-wwn-text-variant">No trending stories available</p>
          <p className="font-data text-xs text-wwn-text-variant mt-2">
            The backend may still be ingesting news. Try again shortly.
          </p>
        </div>
      )}
    </div>
  );
}
