import { useEffect } from "react";
import { useGlobeStore } from "../store/globeStore";
import { fetchCountryNews, fetchCountryBrief } from "../api/client";

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

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchCountryNews(countryCode),
      fetchCountryBrief(countryCode),
    ])
      .then(([newsData, briefData]) => {
        if (cancelled) return;
        setCountryNews(countryCode, newsData);
        setCountryBrief(countryCode, briefData);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
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
