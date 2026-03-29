import { useEffect, useRef } from "react";
import { useGlobeStore } from "../../../store/globeStore";
import { fetchGlobalSentiment } from "../client";
import { indexSentimentEntries } from "../normalizers";

const POLL_INTERVAL_MS = 30_000; // re-fetch every 30s while ingestion is running

export function useGlobalSentiment() {
  const setGlobalSentiment = useGlobeStore((s) => s.setGlobalSentiment);
  const globalSentiment = useGlobeStore((s) => s.globalSentiment);
  const hasData = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const load = () => {
      fetchGlobalSentiment()
        .then((data) => {
          if (cancelled) return;
          setGlobalSentiment(indexSentimentEntries(data));
          // Stop polling once we have a decent amount of data
          if (data.countries.length > 20 && timer) {
            clearInterval(timer);
            timer = null;
            hasData.current = true;
          }
        })
        .catch(() => {});
    };

    load();

    // Poll until we have enough data (ingestion populates the DB gradually)
    if (!hasData.current) {
      timer = setInterval(load, POLL_INTERVAL_MS);
    }

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [setGlobalSentiment]);

  return globalSentiment;
}
