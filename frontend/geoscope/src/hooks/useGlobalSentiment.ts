import { useEffect } from "react";
import { useGlobeStore } from "../store/globeStore";
import { fetchGlobalSentiment } from "../api/client";

export function useGlobalSentiment() {
  const setGlobalSentiment = useGlobeStore((s) => s.setGlobalSentiment);
  const globalSentiment = useGlobeStore((s) => s.globalSentiment);
  const activeDate = useGlobeStore((s) => s.activeDate);

  useEffect(() => {
    let cancelled = false;

    fetchGlobalSentiment()
      .then((data) => {
        if (!cancelled) setGlobalSentiment(data);
      })
      .catch(() => {
        // Silent fail — globe will render without sentiment colors
      });

    return () => {
      cancelled = true;
    };
  }, [activeDate, setGlobalSentiment]);

  return globalSentiment;
}
