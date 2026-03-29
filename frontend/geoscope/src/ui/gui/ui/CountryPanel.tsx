import { motion, AnimatePresence } from "framer-motion";
import { useGlobeStore } from "../../../store/globeStore";
import { useCountryData } from "../../../data/news/hooks/useCountryData";
import { getCountryByCode } from "../../../utils/countryData";
import { useVoiceBrief } from "../../hooks/useVoiceBrief";
import { TagCloud } from "./TagCloud";
import { ArticleCard } from "./ArticleCard";
import { SourcesLoader } from "./SourcesLoader";

export function CountryPanel() {
  const selectedCountry = useGlobeStore((s) => s.selectedCountry);
  const selectedCategory = useGlobeStore((s) => s.selectedCategory);
  const clearSelectedCountry = useGlobeStore((s) => s.clearSelectedCountry);
  const isLoading = useGlobeStore((s) => s.isLoading);
  const error = useGlobeStore((s) => s.error);
  const { news, brief } = useCountryData(selectedCountry);
  const { speak, stop, isSpeaking } = useVoiceBrief();

  const countryInfo = selectedCountry
    ? getCountryByCode(selectedCountry)
    : null;

  // Filter articles by category
  const filteredArticles = selectedCategory && news?.articles
    ? news.articles.filter((article) => article.category === selectedCategory)
    : news?.articles || [];

  const handleReadBrief = () => {
    if (isSpeaking) {
      stop();
    } else if (brief) {
      speak(brief.summary);
    }
  };

  return (
    <AnimatePresence>
      {selectedCountry && countryInfo && (
        <motion.div
          key="country-panel"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed top-0 right-0 h-full w-full max-w-md z-50 flex flex-col bg-slate-900/95 backdrop-blur-md border-l border-slate-800"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{countryInfo.flag}</span>
              <div>
                <h2 className="text-lg font-semibold text-slate-100">
                  {countryInfo.name}
                </h2>
                <span className="text-xs text-slate-500">
                  {countryInfo.code}
                </span>
              </div>
            </div>
            <button
              onClick={clearSelectedCountry}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800 transition-colors duration-200 text-slate-400 hover:text-slate-200"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth" style={{
            WebkitOverflowScrolling: "touch",
            scrollBehavior: "auto",
            overscrollBehavior: "contain",
          }}>
            {isLoading && <SourcesLoader />}

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            {brief && !isLoading && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">
                    {brief.articleCount} articles analyzed
                  </span>
                </div>

                {/* AI Summary */}
                <div className="p-3 rounded-lg bg-globe-card border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      AI Brief
                    </h3>
                    <button
                      onClick={handleReadBrief}
                      className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium text-accent-teal hover:bg-accent-teal/10 transition-colors duration-200"
                    >
                      {isSpeaking ? (
                        <>
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 12 12"
                            fill="currentColor"
                          >
                            <rect x="2" y="2" width="3" height="8" rx="0.5" />
                            <rect x="7" y="2" width="3" height="8" rx="0.5" />
                          </svg>
                          Stop
                        </>
                      ) : (
                        <>
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 12 12"
                            fill="currentColor"
                          >
                            <path d="M3 1.5v9l7.5-4.5z" />
                          </svg>
                          Read Brief
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {brief.summary}
                  </p>
                </div>

                {/* Key Actors */}
                {brief.keyActors.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                      Key Actors
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {brief.keyActors.map((actor) => (
                        <span
                          key={actor}
                          className="px-2.5 py-1 text-xs font-medium rounded-full bg-accent-teal/10 text-accent-teal border border-accent-teal/20"
                        >
                          {actor}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Topic Tags */}
                {brief.topicTags.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                      Topics
                    </h3>
                    <TagCloud tags={brief.topicTags} />
                  </div>
                )}
              </>
            )}

            {/* Articles */}
            {news && filteredArticles.length > 0 && !isLoading && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                  Latest Articles
                  {selectedCategory && (
                    <span className="ml-2 text-accent-teal">
                      ({filteredArticles.length})
                    </span>
                  )}
                </h3>
                <div className="space-y-2">
                  {filteredArticles.map((article) => (
                    <ArticleCard
                      key={article.id}
                      title={article.title}
                      source={article.source}
                      publishedAt={article.publishedAt}
                      url={article.url}
                      sentiment={article.sentiment}
                    />
                  ))}
                </div>
              </div>
            )}

            {selectedCategory && news && filteredArticles.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center py-8 text-slate-500 rounded-lg bg-slate-800/30 border border-slate-700/50">
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="mb-2 opacity-50"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
                <p className="text-sm">No articles in this category</p>
              </div>
            )}

            {!isLoading && !error && !brief && (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="mb-3 opacity-50"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                <p className="text-sm">No data available for this country</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
