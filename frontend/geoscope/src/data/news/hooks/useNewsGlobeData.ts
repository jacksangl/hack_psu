import { useEffect, useMemo, useRef } from "react";
import { useGlobeStore } from "../../../store/globeStore";
import { getCountryByCode } from "../../../utils/countryData";
import { fetchCountryNews } from "../client";
import { clusterPins, type PinData } from "../processing/clusterPins";
import { NEWS_GLOBE_CONFIG } from "../../../ui/news/globe/globeConfig";

export interface NewsGlobeArc {
  key: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
  opacity: number;
}

export function useNewsGlobeData() {
  const selectedCountry = useGlobeStore((state) => state.selectedCountry);
  const countryNews = useGlobeStore((state) => state.countryNews);
  const globalSentiment = useGlobeStore((state) => state.globalSentiment);
  const setCountryNews = useGlobeStore((state) => state.setCountryNews);
  const connectDotsMode = useGlobeStore((state) => state.connectDotsMode);
  const selectedCategory = useGlobeStore((state) => state.selectedCategory);
  const prefetchFailedCodesRef = useRef(new Set<string>());
  const prefetchInFlightCodesRef = useRef(new Set<string>());

  const pins = useMemo(() => {
    const newsData = selectedCountry ? countryNews[selectedCountry] : null;
    const articles = newsData?.articles ?? [];
    const filtered = selectedCategory
      ? articles.filter((a) => a.category === selectedCategory)
      : articles;
    const pinData: PinData[] = filtered.map((article) => ({
      id: article.id,
      title: article.title,
      lat: article.lat,
      lng: article.lng,
      sentiment: article.sentiment,
      url: article.url,
      source: article.source,
    }));

    return clusterPins(pinData);
  }, [selectedCountry, countryNews, selectedCategory]);

  const markerCountryCodes = useMemo(() => {
    const prioritized = Object.values(globalSentiment)
      .filter((entry) => (entry.articleCount ?? 0) > 0)
      .sort(
        (left, right) =>
          (right.articleCount ?? 0) - (left.articleCount ?? 0) ||
          left.countryCode.localeCompare(right.countryCode)
      )
      .map((entry) => entry.countryCode)
      .filter((countryCode) => getCountryByCode(countryCode));

    if (selectedCountry) {
      prioritized.unshift(selectedCountry);
    }

    return Array.from(new Set(prioritized)).slice(0, NEWS_GLOBE_CONFIG.prefetchCountryLimit);
  }, [globalSentiment, selectedCountry]);

  const connectDotsCountryCodes = useMemo(
    () => markerCountryCodes.slice(0, NEWS_GLOBE_CONFIG.connectDotsCountryLimit),
    [markerCountryCodes]
  );

  useEffect(() => {
    const uncachedCodes = markerCountryCodes.filter(
      (countryCode) =>
        !countryNews[countryCode] &&
        !prefetchInFlightCodesRef.current.has(countryCode) &&
        !prefetchFailedCodesRef.current.has(countryCode)
    );

    if (uncachedCodes.length === 0) {
      return;
    }

    let cancelled = false;
    const queue = [...uncachedCodes];
    const workerCount = Math.min(
      NEWS_GLOBE_CONFIG.prefetchConcurrency,
      queue.length
    );

    const workers = Array.from({ length: workerCount }, async () => {
      while (!cancelled) {
        const countryCode = queue.shift();
        if (!countryCode) {
          return;
        }

        prefetchInFlightCodesRef.current.add(countryCode);

        try {
          const news = await fetchCountryNews(countryCode);
          if (!cancelled) {
            setCountryNews(countryCode, news);
          }
        } catch {
          prefetchFailedCodesRef.current.add(countryCode);
        } finally {
          prefetchInFlightCodesRef.current.delete(countryCode);
        }
      }
    });

    void Promise.allSettled(workers);

    return () => {
      cancelled = true;
    };
  }, [markerCountryCodes, countryNews, setCountryNews]);

  const arcs = useMemo(() => {
    if (!connectDotsMode) return [] as NewsGlobeArc[];

    const arcSet = new Set<string>();
    const arcList: NewsGlobeArc[] = [];

    for (const sourceCode of connectDotsCountryCodes) {
      const newsData = countryNews[sourceCode];
      const sourceCountry = getCountryByCode(sourceCode);

      if (!newsData || !sourceCountry) {
        continue;
      }

      const filteredArticles = selectedCategory
        ? newsData.articles.filter((a) => a.category === selectedCategory)
        : newsData.articles;

      for (const article of filteredArticles) {
        for (const relatedCode of article.relatedCountries) {
          const targetCountry = getCountryByCode(relatedCode);
          if (!targetCountry || relatedCode === sourceCode) {
            continue;
          }

          const arcKey = [sourceCode, relatedCode].sort().join("-");
          if (arcSet.has(arcKey)) {
            continue;
          }
          arcSet.add(arcKey);

          const isSelectedArc =
            selectedCountry != null &&
            (sourceCode === selectedCountry || relatedCode === selectedCountry);

          arcList.push({
            key: arcKey,
            startLat: sourceCountry.lat,
            startLng: sourceCountry.lng,
            endLat: targetCountry.lat,
            endLng: targetCountry.lng,
            color: isSelectedArc ? "#FBBF24" : "#2DD4BF",
            opacity: isSelectedArc ? 0.9 : 0.55,
          });
        }
      }
    }

    return arcList;
  }, [connectDotsMode, connectDotsCountryCodes, selectedCountry, countryNews, selectedCategory]);

  return { pins, arcs };
}
