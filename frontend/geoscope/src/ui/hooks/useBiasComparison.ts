import { useState, useEffect } from "react";
import { fetchBiasComparison, type BiasComparisonResponse } from "../../data/news/client";

export function useBiasComparison(
  title: string | null,
  source: string | null,
  url: string | null
) {
  const [data, setData] = useState<BiasComparisonResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!title || !url) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchBiasComparison(title, source ?? "", url)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load comparison");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [title, source, url]);

  return { data, isLoading, error };
}
