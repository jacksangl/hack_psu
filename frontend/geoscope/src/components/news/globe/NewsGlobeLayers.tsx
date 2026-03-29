import { useEffect, useMemo } from "react";
import { useGlobeStore } from "../../../store/globeStore";
import { getCountryByCode } from "../../../utils/countryData";
import { clusterPins, type PinData } from "../../../utils/clusterPins";
import { fetchCountryNews } from "../../../api/client";
import { ArcLine } from "./ArcLine";
import { NewsHeatmap } from "./NewsHeatmap";
import { NewsPin } from "./NewsPin";
import { SentimentOverlay } from "./SentimentOverlay";

const CONNECT_DOTS_COUNTRY_LIMIT = 10;

export function NewsGlobeLayers() {
  const selectedCountry = useGlobeStore((s) => s.selectedCountry);
  const countryNews = useGlobeStore((s) => s.countryNews);
  const globalSentiment = useGlobeStore((s) => s.globalSentiment);
  const setCountryNews = useGlobeStore((s) => s.setCountryNews);
  const connectDotsMode = useGlobeStore((s) => s.connectDotsMode);

  const pins = useMemo(() => {
    const allPins: PinData[] = [];
    const newsData = selectedCountry ? countryNews[selectedCountry] : null;
    if (newsData) {
      for (const article of newsData.articles) {
        allPins.push({
          id: article.id,
          title: article.title,
          lat: article.lat,
          lng: article.lng,
          sentiment: article.sentiment,
          url: article.url,
          source: article.source,
        });
      }
    }
    return clusterPins(allPins);
  }, [selectedCountry, countryNews]);

  const connectDotsCountryCodes = useMemo(() => {
    const prioritized = Object.values(globalSentiment)
      .sort(
        (left, right) =>
          Math.abs(right.sentimentScore) - Math.abs(left.sentimentScore) ||
          left.countryCode.localeCompare(right.countryCode)
      )
      .map((entry) => entry.countryCode);

    if (selectedCountry) {
      prioritized.unshift(selectedCountry);
    }

    return Array.from(new Set(prioritized)).slice(0, CONNECT_DOTS_COUNTRY_LIMIT);
  }, [globalSentiment, selectedCountry]);

  useEffect(() => {
    if (!connectDotsMode) {
      return;
    }

    const uncachedCodes = connectDotsCountryCodes.filter(
      (countryCode) => !countryNews[countryCode]
    );

    if (uncachedCodes.length === 0) {
      return;
    }

    let cancelled = false;

    Promise.allSettled(
      uncachedCodes.map(async (countryCode) => {
        const news = await fetchCountryNews(countryCode);
        if (!cancelled) {
          setCountryNews(countryCode, news);
        }
      })
    ).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [connectDotsMode, connectDotsCountryCodes, countryNews, setCountryNews]);

  const arcs = useMemo(() => {
    if (!connectDotsMode) return [];
    const arcSet = new Set<string>();
    const arcList: {
      key: string;
      startLat: number;
      startLng: number;
      endLat: number;
      endLng: number;
      color: string;
      opacity: number;
    }[] = [];

    for (const sourceCode of connectDotsCountryCodes) {
      const newsData = countryNews[sourceCode];
      const sourceCountry = getCountryByCode(sourceCode);

      if (!newsData || !sourceCountry) {
        continue;
      }

      for (const article of newsData.articles) {
        for (const relCode of article.relatedCountries) {
          const target = getCountryByCode(relCode);
          if (!target || relCode === sourceCode) continue;

          const arcKey = [sourceCode, relCode].sort().join("-");
          if (arcSet.has(arcKey)) continue;
          arcSet.add(arcKey);

          const isSelectedArc =
            selectedCountry != null &&
            (sourceCode === selectedCountry || relCode === selectedCountry);

          arcList.push({
            key: arcKey,
            startLat: sourceCountry.lat,
            startLng: sourceCountry.lng,
            endLat: target.lat,
            endLng: target.lng,
            color: isSelectedArc ? "#F59E0B" : "#14B8A6",
            opacity: isSelectedArc ? 0.8 : 0.28,
          });
        }
      }
    }

    return arcList;
  }, [connectDotsMode, connectDotsCountryCodes, selectedCountry, countryNews]);

  return (
    <>
      <NewsHeatmap />
      <SentimentOverlay />

      {pins.map((cluster) => (
        <NewsPin
          key={cluster.id}
          lat={cluster.lat}
          lng={cluster.lng}
          sentiment={cluster.sentiment}
          title={
            cluster.count > 1
              ? `${cluster.count} stories in this area`
              : cluster.pins[0].title
          }
          url={cluster.pins[0].url}
          count={cluster.count}
        />
      ))}

      {arcs.map((arc) => (
        <ArcLine
          key={arc.key}
          startLat={arc.startLat}
          startLng={arc.startLng}
          endLat={arc.endLat}
          endLng={arc.endLng}
          color={arc.color}
          opacity={arc.opacity}
        />
      ))}
    </>
  );
}
