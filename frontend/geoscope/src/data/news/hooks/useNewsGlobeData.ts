import { useEffect, useMemo, useRef } from "react";
import { useGlobeStore } from "../../../store/globeStore";
import { getCountryByCode } from "../../../utils/countryData";
import { fetchCountryNews } from "../client";
import { clusterPins, type PinData } from "../processing/clusterPins";

const CONNECT_DOTS_COUNTRY_LIMIT = 10;
const COUNTRY_NEWS_PREFETCH_CONCURRENCY = 4;
const PREFETCH_COUNTRY_LIMIT = 30;

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
  const prefetchFailedCodesRef = useRef(new Set<string>());
  const prefetchInFlightCodesRef = useRef(new Set<string>());

  const pins = useMemo(() => {
    const newsData = selectedCountry ? countryNews[selectedCountry] : null;
    const pinData: PinData[] =
      newsData?.articles.map((article) => ({
        id: article.id,
        title: article.title,
        lat: article.lat,
        lng: article.lng,
        sentiment: article.sentiment,
        url: article.url,
        source: article.source,
      })) ?? [];

    return clusterPins(pinData);
  }, [selectedCountry, countryNews]);

  const markerCountryCodes = useMemo(() => {
    const prioritized = Object.values(globalSentiment)
      .sort(
        (left, right) =>
          Math.abs(right.sentimentScore) - Math.abs(left.sentimentScore) ||
          left.countryCode.localeCompare(right.countryCode)
      )
      .map((entry) => entry.countryCode)
      .filter((countryCode) => getCountryByCode(countryCode));

    if (selectedCountry) {
      prioritized.unshift(selectedCountry);
    }

    return Array.from(new Set(prioritized)).slice(0, PREFETCH_COUNTRY_LIMIT);
  }, [globalSentiment, selectedCountry]);

  const connectDotsCountryCodes = useMemo(
    () => markerCountryCodes.slice(0, CONNECT_DOTS_COUNTRY_LIMIT),
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
      COUNTRY_NEWS_PREFETCH_CONCURRENCY,
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

      for (const article of newsData.articles) {
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
            color: isSelectedArc ? "#F59E0B" : "#14B8A6",
            opacity: isSelectedArc ? 0.8 : 0.28,
          });
        }
      }
    }

    return arcList;
  }, [connectDotsMode, connectDotsCountryCodes, selectedCountry, countryNews]);

  return { pins, arcs };
}
