import { useState, useEffect } from "react";
import { fetchTrendingNews, type TrendingResponse } from "../../data/news/client";

export function useTrendingNews(category?: string) {
  const [data, setData] = useState<TrendingResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchTrendingNews(category)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load trending news");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [category]);

  return { data, isLoading, error };
}
