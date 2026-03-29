export const HEATMAP_COLOR_RANGE = {
  low: { r: 43, g: 52, b: 64 },
  high: { r: 226, g: 232, b: 240 },
} as const;

export const HEATMAP_GRADIENT_STOPS = [0, 0.25, 0.5, 0.75, 1] as const;

export function heatToHex(heat: number): string {
  const h = Math.max(0, Math.min(1, heat));
  const { low, high } = HEATMAP_COLOR_RANGE;
  const r = Math.round(low.r + (high.r - low.r) * h);
  const g = Math.round(low.g + (high.g - low.g) * h);
  const b = Math.round(low.b + (high.b - low.b) * h);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export function heatToRgb(heat: number): [number, number, number] {
  const h = Math.max(0, Math.min(1, heat));
  const { low, high } = HEATMAP_COLOR_RANGE;
  return [
    (low.r + (high.r - low.r) * h) / 255,
    (low.g + (high.g - low.g) * h) / 255,
    (low.b + (high.b - low.b) * h) / 255,
  ];
}

export function getHeatLabel(heat: number): string {
  if (heat < 0.2) return "Low";
  if (heat < 0.4) return "Light";
  if (heat < 0.6) return "Moderate";
  if (heat < 0.8) return "High";
  return "Peak";
}
