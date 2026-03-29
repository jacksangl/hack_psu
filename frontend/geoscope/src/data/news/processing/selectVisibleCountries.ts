import type { CountryHeatData } from "./countryHeat";

export interface VisibleCountryEntry {
  articleCount: number;
  countryCode: string;
  hasNews: boolean;
  heat: number;
  sourceCount: number;
}

function sortVisibleCountries(left: VisibleCountryEntry, right: VisibleCountryEntry): number {
  return (
    right.articleCount - left.articleCount
    || right.heat - left.heat
    || right.sourceCount - left.sourceCount
    || left.countryCode.localeCompare(right.countryCode)
  );
}

export function selectVisibleCountries(
  heatData: CountryHeatData,
  options?: {
    limit?: number;
    selectedCountry?: string | null;
  },
): VisibleCountryEntry[] {
  const limit = options?.limit ?? Number.POSITIVE_INFINITY;
  const selectedCountry = options?.selectedCountry ?? null;

  const ranked = Object.entries(heatData)
    .map(([countryCode, entry]) => ({
      countryCode,
      heat: entry.heat,
      articleCount: entry.articleCount,
      sourceCount: entry.sourceCount,
      hasNews: entry.hasNews,
    }))
    .filter((entry) => entry.hasNews && entry.articleCount > 0)
    .sort(sortVisibleCountries);

  const selectedEntry = selectedCountry ? ranked.find((entry) => entry.countryCode === selectedCountry) : null;
  const limited = ranked.slice(0, limit);

  if (selectedEntry && !limited.some((entry) => entry.countryCode === selectedCountry)) {
    return [selectedEntry, ...limited.slice(0, Math.max(0, limit - 1))];
  }

  return limited;
}
