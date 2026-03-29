import { useMemo } from "react";
import { useGlobeStore } from "../../../store/globeStore";
import { buildCountryVisualHeatData } from "../processing/countryHeat";
import type { NewsResponse } from "../types";

export function useCountryVisualHeatData() {
  const globalSentiment = useGlobeStore((state) => state.globalSentiment);
  const countryNews = useGlobeStore((state) => state.countryNews);
  const selectedCategory = useGlobeStore((state) => state.selectedCategory);

  const filteredNews = useMemo(() => {
    if (!selectedCategory) return countryNews;

    const filtered: Record<string, NewsResponse> = {};
    for (const [code, news] of Object.entries(countryNews)) {
      const articles = news.articles.filter(
        (a) => a.category === selectedCategory
      );
      if (articles.length > 0) {
        filtered[code] = { ...news, articles };
      }
    }
    return filtered;
  }, [countryNews, selectedCategory]);

  return useMemo(
    () => buildCountryVisualHeatData(globalSentiment, filteredNews),
    [globalSentiment, filteredNews]
  );
}
