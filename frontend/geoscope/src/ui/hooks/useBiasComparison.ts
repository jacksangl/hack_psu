import { useState, useEffect, useRef } from "react";
import { fetchBiasComparison, type BiasComparisonResponse, type SourceCoverage } from "../../data/news/client";

const cache = new Map<string, BiasComparisonResponse>();

export function useBiasComparison(
  title: string | null,
  source: string | null,
  url: string | null,
  description?: string | null,
  knownSources?: SourceCoverage[] | null,
) {
  const cached = url ? cache.get(url) : undefined;
  const [data, setData] = useState<BiasComparisonResponse | null>(cached ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevUrl = useRef(url);

  useEffect(() => {
    if (!title || !url) return;

    if (prevUrl.current !== url) {
      prevUrl.current = url;
      const hit = cache.get(url);
      if (hit) {
        setData(hit);
        return;
      }
    }

    if (cache.has(url)) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchBiasComparison(title, source ?? "", url, description, knownSources)
      .then((res) => {
        cache.set(url, res);
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
  }, [title, source, url, description, knownSources]);

  return { data, isLoading, error };
}
