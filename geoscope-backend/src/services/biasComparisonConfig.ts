export interface BiasComparisonConfig {
  cacheTtlSeconds: number;
  maxOtherSources: number;
  timeWindowHours: number;
  minHeadlineSimilarity: number;
  minEventMatchScore: number;
  maxSignals: number;
}

const parseInteger = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseFloatValue = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const loadBiasComparisonConfig = (
  input: NodeJS.ProcessEnv = process.env,
): BiasComparisonConfig => ({
  cacheTtlSeconds: parseInteger(input.BIAS_COMPARISON_CACHE_TTL_SECONDS, 30 * 60),
  maxOtherSources: parseInteger(input.BIAS_COMPARISON_MAX_OTHER_SOURCES, 5),
  timeWindowHours: parseInteger(input.BIAS_COMPARISON_TIME_WINDOW_HOURS, 48),
  minHeadlineSimilarity: parseFloatValue(input.BIAS_COMPARISON_MIN_HEADLINE_SIMILARITY, 0.35),
  minEventMatchScore: parseFloatValue(input.BIAS_COMPARISON_MIN_EVENT_MATCH_SCORE, 0.45),
  maxSignals: parseInteger(input.BIAS_COMPARISON_MAX_SIGNALS, 8),
});
