import { useMemo } from "react";
import { useGlobeStore } from "../../../store/globeStore";
import { buildCountryVisualHeatData } from "../processing/countryHeat";

export function useCountryVisualHeatData() {
  const globalSentiment = useGlobeStore((state) => state.globalSentiment);
  const countryNews = useGlobeStore((state) => state.countryNews);

  return useMemo(
    () => buildCountryVisualHeatData(globalSentiment, countryNews),
    [globalSentiment, countryNews]
  );
}

