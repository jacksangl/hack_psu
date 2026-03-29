import { useEffect } from "react";
import { useGlobeStore } from "../../../store/globeStore";
import { fetchCountryBrief, fetchCountryNews } from "../client";

export function useCountryData(countryCode: string | null) {
  const setCountryNews = useGlobeStore((s) => s.setCountryNews);
  const setCountryBrief = useGlobeStore((s) => s.setCountryBrief);
  const setLoading = useGlobeStore((s) => s.setLoading);
  const setError = useGlobeStore((s) => s.setError);
  const news = useGlobeStore((s) =>
    countryCode ? s.countryNews[countryCode] : undefined
  );
  const brief = useGlobeStore((s) =>
    countryCode ? s.countryBriefs[countryCode] : undefined
  );

  useEffect(() => {
    if (!countryCode) return;

    // Read current store state directly to avoid re-triggering the effect
    const state = useGlobeStore.getState();
    const hasNews = !!state.countryNews[countryCode];
    const hasBrief = !!state.countryBriefs[countryCode];

    if (hasNews && hasBrief) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const newsPromise = hasNews
      ? Promise.resolve()
      : fetchCountryNews(countryCode).then((data) => {
          if (!cancelled) setCountryNews(countryCode, data);
        });

    const briefPromise = hasBrief
      ? Promise.resolve()
      : fetchCountryBrief(countryCode).then((data) => {
          if (!cancelled) setCountryBrief(countryCode, data);
        });

    Promise.all([newsPromise, briefPromise])
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [countryCode, setCountryNews, setCountryBrief, setLoading, setError]);

  return { news, brief };
}
