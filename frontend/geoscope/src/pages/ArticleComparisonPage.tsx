import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useBiasComparison } from "../ui/hooks/useBiasComparison";
import { SourcesLoader } from "../ui/gui/ui/SourcesLoader";
import type { SourceCoverage } from "../data/news/client";

function SourceCard({
  coverage,
  isOriginal,
}: {
  coverage: SourceCoverage;
  isOriginal?: boolean;
}) {
  return (
    <div
      className={`p-5 transition-colors duration-200 ${
        isOriginal
          ? "bg-wwn-primary/5 ring-1 ring-wwn-primary/20"
          : "bg-wwn-surface-low"
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="font-data text-[10px] font-semibold uppercase tracking-[0.15em] text-wwn-primary-soft">
          {coverage.source}
        </span>
        {isOriginal && (
          <span className="px-2 py-0.5 bg-wwn-primary/15 text-wwn-primary font-data text-[9px] uppercase tracking-wider">
            Original
          </span>
        )}
      </div>
      <h4 className="font-serif text-base font-medium text-wwn-on-surface leading-snug mb-2">
        {coverage.headline}
      </h4>
      {coverage.summary && (
        <p className="font-body text-sm text-wwn-text-variant leading-relaxed">
          {coverage.summary}
        </p>
      )}
      <a
        href={coverage.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 mt-3 font-data text-xs text-wwn-primary-soft hover:text-wwn-primary transition-colors"
      >
        Read Full Article
        <svg
          width="10"
          height="10"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M2 10L10 2M10 2H4M10 2v6" />
        </svg>
      </a>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-wwn-surface-high rounded w-3/4" />
      <div className="h-4 bg-wwn-surface-high rounded w-1/2" />
      <div className="flex gap-2 mb-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-6 w-20 bg-wwn-surface-high rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-wwn-surface-low rounded" />
        ))}
      </div>
      <div className="space-y-3">
        <div className="h-4 bg-wwn-surface-high rounded w-2/3" />
        <div className="h-4 bg-wwn-surface-high rounded w-1/2" />
        <div className="h-4 bg-wwn-surface-high rounded w-3/4" />
      </div>
    </div>
  );
}

export function ArticleComparisonPage() {
  const { encodedUrl } = useParams<{ encodedUrl: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state as {
    title?: string;
    source?: string;
    url?: string;
  } | null;

  const articleUrl = state?.url ?? (encodedUrl ? decodeURIComponent(encodedUrl) : null);
  const articleTitle = state?.title ?? null;
  const articleSource = state?.source ?? null;

  const { data, isLoading, error } = useBiasComparison(
    articleTitle,
    articleSource,
    articleUrl
  );

  return (
    <div className="w-full h-full overflow-y-auto bg-wwn-bg pt-14">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 mb-8 font-data text-xs uppercase tracking-wider text-wwn-text-variant hover:text-wwn-primary-soft transition-colors"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M9 3L5 7l4 4" />
          </svg>
          Back
        </button>

        {isLoading && (
          <>
            <SourcesLoader label="Finding similar coverage" />
            <LoadingSkeleton />
          </>
        )}

        {error && (
          <div className="p-4 bg-red-500/10 text-red-400 font-body text-sm">
            {error}
          </div>
        )}

        {data && (
          <>
            {/* Header */}
            <header className="mb-8">
              <span className="font-data text-[10px] font-semibold uppercase tracking-[0.15em] text-wwn-primary mb-3 block">
                Multi-Source Analysis
              </span>
              <h1 className="font-serif text-2xl md:text-4xl font-bold text-wwn-on-surface leading-tight mb-4">
                {data.storyTitle}
              </h1>
              <p className="font-body text-sm text-wwn-text-variant">
                Comparing coverage from {data.otherSources.length + 1} sources
              </p>
            </header>

            {/* Key Topics */}
            {data.keyTopics && data.keyTopics.length > 0 && (
              <section className="mb-8">
                <h3 className="font-data text-[10px] font-semibold uppercase tracking-[0.15em] text-wwn-text-variant mb-3">
                  Key Topics
                </h3>
                <div className="flex flex-wrap gap-2">
                  {data.keyTopics.map((topic, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-wwn-primary/10 text-wwn-primary-soft font-data text-xs tracking-wide"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Bullet summary */}
            {data.bulletSummary && data.bulletSummary.length > 0 && (
              <section className="mb-8">
                <h3 className="font-data text-[10px] font-semibold uppercase tracking-[0.15em] text-wwn-text-variant mb-3">
                  Bullet-Point Summary
                </h3>
                <div className="bg-wwn-surface-low ring-1 ring-wwn-surface-high p-5 space-y-3">
                  {data.bulletSummary.map((point, i) => (
                    <div key={i} className="flex gap-3">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-wwn-primary-soft flex-shrink-0" />
                      <p className="font-body text-sm text-wwn-on-surface leading-relaxed">
                        {point}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Original source */}
            <section className="mb-8">
              <h3 className="font-data text-[10px] font-semibold uppercase tracking-[0.15em] text-wwn-text-variant mb-3">
                Original Source
              </h3>
              <SourceCard coverage={data.originalSource} isOriginal />
            </section>

            {/* Other sources */}
            {data.otherSources.length > 0 && (
              <section className="mb-8">
                <h3 className="font-data text-[10px] font-semibold uppercase tracking-[0.15em] text-wwn-text-variant mb-3">
                  Other Sources
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {data.otherSources.map((source, i) => (
                    <SourceCard key={i} coverage={source} />
                  ))}
                </div>
              </section>
            )}

            {/* Where sources agree */}
            {data.consensus && data.consensus.length > 0 && (
              <section className="mb-8">
                <h3 className="font-data text-[10px] font-semibold uppercase tracking-[0.15em] text-wwn-text-variant mb-3">
                  Where Sources Agree
                </h3>
                <div className="bg-emerald-500/5 ring-1 ring-emerald-500/15 p-5 space-y-3">
                  {data.consensus.map((point, i) => (
                    <div key={i} className="flex gap-3">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        className="flex-shrink-0 mt-0.5 text-emerald-400"
                      >
                        <path
                          d="M3 8.5L6.5 12L13 4"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <p className="font-body text-sm text-wwn-on-surface leading-relaxed">
                        {point}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Where sources differ */}
            {data.disagreements && data.disagreements.length > 0 && (
              <section className="mb-8">
                <h3 className="font-data text-[10px] font-semibold uppercase tracking-[0.15em] text-wwn-text-variant mb-3">
                  Where Sources Differ
                </h3>
                <div className="bg-amber-500/5 ring-1 ring-amber-500/15 p-5 space-y-3">
                  {data.disagreements.map((point, i) => (
                    <div key={i} className="flex gap-3">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        className="flex-shrink-0 mt-0.5 text-amber-400"
                      >
                        <path
                          d="M8 3v6M8 12v.5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                      <p className="font-body text-sm text-wwn-on-surface leading-relaxed">
                        {point}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Key differences (legacy field, still useful) */}
            {data.keyDifferences.length > 0 && (
              <section className="mb-8">
                <h3 className="font-data text-[10px] font-semibold uppercase tracking-[0.15em] text-wwn-text-variant mb-3">
                  Detailed Differences
                </h3>
                <div className="bg-wwn-surface-low p-5 space-y-3">
                  {data.keyDifferences.map((diff, i) => (
                    <div key={i} className="flex gap-3">
                      <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-wwn-primary/10 text-wwn-primary font-data text-[10px] font-bold">
                        {i + 1}
                      </span>
                      <p className="font-body text-sm text-wwn-on-surface leading-relaxed">
                        {diff}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {data.otherSources.length === 0 && data.keyDifferences.length === 0 && (
              <div className="p-5 bg-wwn-surface-low text-center">
                <p className="font-body text-sm text-wwn-text-variant">
                  No other sources found covering this story yet.
                </p>
                <a
                  href={articleUrl ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-wwn-primary/15 text-wwn-primary font-data text-xs uppercase tracking-wider hover:bg-wwn-primary/25 transition-colors"
                >
                  Read Original Article
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M2 10L10 2M10 2H4M10 2v6" />
                  </svg>
                </a>
              </div>
            )}
          </>
        )}

        {/* Fallback if no article info */}
        {!isLoading && !error && !data && !articleTitle && (
          <div className="text-center py-12">
            <p className="font-body text-sm text-wwn-text-variant mb-4">
              No article information available.
            </p>
            <button
              onClick={() => navigate("/")}
              className="font-data text-xs uppercase tracking-wider text-wwn-primary-soft hover:text-wwn-primary transition-colors"
            >
              Back to News
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
