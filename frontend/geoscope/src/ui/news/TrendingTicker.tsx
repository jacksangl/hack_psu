import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { TrendingArticle } from "../../data/news/client";

const AUTO_ROTATE_MS = 5000;
const CARDS_PER_PAGE_DESKTOP = 3;

function formatTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
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
  const display = articles.slice(0, 9);
  const totalPages = Math.ceil(display.length / CARDS_PER_PAGE_DESKTOP);
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const next = useCallback(() => {
    setPage((p) => (p + 1) % totalPages);
  }, [totalPages]);

  const prev = useCallback(() => {
    setPage((p) => (p - 1 + totalPages) % totalPages);
  }, [totalPages]);

  useEffect(() => {
    if (paused || totalPages <= 1) return;
    timerRef.current = setInterval(next, AUTO_ROTATE_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused, next, totalPages]);

  if (display.length === 0) return null;

  const offset = -(page * 100);

  return (
    <section
      className="bg-wwn-surface-lowest py-4 overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="flex items-center justify-between px-6 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-wwn-primary animate-pulse" />
          <span className="font-data text-[10px] font-semibold uppercase tracking-[0.15em] text-wwn-primary-soft">
            Trending Now
          </span>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={prev}
              className="w-7 h-7 flex items-center justify-center bg-wwn-surface-low hover:bg-wwn-surface-high transition-colors text-wwn-text-variant hover:text-wwn-on-surface"
              aria-label="Previous"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M8 2L4 6l4 4" />
              </svg>
            </button>
            <button
              onClick={next}
              className="w-7 h-7 flex items-center justify-center bg-wwn-surface-low hover:bg-wwn-surface-high transition-colors text-wwn-text-variant hover:text-wwn-on-surface"
              aria-label="Next"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 2l4 4-4 4" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Carousel track */}
      <div className="px-6">
        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(${offset}%)` }}
          >
            {display.map((article) => (
              <div
                key={article.id}
                className="w-full md:w-1/3 flex-shrink-0 px-2"
              >
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
                  className="w-full p-4 bg-wwn-surface-low hover:bg-wwn-surface-high transition-colors duration-200 text-left group"
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
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dot indicators */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
                i === page ? "bg-wwn-primary" : "bg-wwn-surface-high"
              }`}
              aria-label={`Go to page ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
