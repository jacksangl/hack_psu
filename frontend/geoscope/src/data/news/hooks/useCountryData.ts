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

    // Skip fetching if we already have both news and brief cached in store
    if (news && brief) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    // Load news and brief independently so whichever finishes first renders immediately
    const newsPromise = news
      ? Promise.resolve(news)
      : fetchCountryNews(countryCode)
          .then((data) => {
            if (!cancelled) setCountryNews(countryCode, data);
            return data;
          });

    const briefPromise = brief
      ? Promise.resolve(brief)
      : fetchCountryBrief(countryCode)
          .then((data) => {
            if (!cancelled) setCountryBrief(countryCode, data);
            return data;
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
  }, [countryCode, setCountryNews, setCountryBrief, setLoading, setError, news, brief]);

  return { news, brief };
}
