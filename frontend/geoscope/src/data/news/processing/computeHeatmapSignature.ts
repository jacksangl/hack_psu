import type { NewsCategory } from "../types";
import type { VisibleCountryEntry } from "./selectVisibleCountries";

export function computeHeatmapSignature(
  visibleCountries: VisibleCountryEntry[],
  selectedCategory: NewsCategory | null,
  heatBucketCount: number
): string {
  const bucketed = visibleCountries
    .map(
      (entry) =>
        `${entry.countryCode}:${Math.round(entry.heat * heatBucketCount)}`
    )
    .join(",");

  return `${selectedCategory ?? "all"}|${bucketed}`;
}
